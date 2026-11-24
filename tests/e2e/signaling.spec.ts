import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

const FIRESTORE = "http://127.0.0.1:8080";
const PROJECT = "demo-devomegle";
const ROOMS_URL = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/rooms`;
const ADMIN_HEADERS = { Authorization: "Bearer owner" };

interface TestUser {
  context: Awaited<ReturnType<Browser["newContext"]>>;
  page: Page;
}

const clearRooms = async (request: APIRequestContext) => {
  const response = await request.get(ROOMS_URL, { headers: ADMIN_HEADERS });
  if (!response.ok()) {
    throw new Error(`Unable to list rooms: ${response.status()}`);
  }
  const payload = (await response.json().catch(() => ({}))) as {
    documents?: Array<{ name: string }>;
  };

  for (const document of payload.documents ?? []) {
    const id = document.name.split("/").pop();
    await request.delete(`${ROOMS_URL}/${id}`, { headers: ADMIN_HEADERS });
  }
};

const roomCount = async (request: APIRequestContext) => {
  const response = await request.get(ROOMS_URL, { headers: ADMIN_HEADERS });
  if (!response.ok()) {
    throw new Error(`Unable to count rooms: ${response.status()}`);
  }
  const payload = (await response.json().catch(() => ({}))) as {
    documents?: unknown[];
  };
  return payload.documents?.length ?? 0;
};

/**
 * Wraps getUserMedia so the test can count camera tracks that were acquired but
 * never stopped, which is what "the camera light stays on" means in practice.
 */
const trackCounterScript = () => {
  const target = window as unknown as { __liveVideoTracks?: number };
  target.__liveVideoTracks = 0;

  const original = navigator.mediaDevices.getUserMedia.bind(
    navigator.mediaDevices
  );

  navigator.mediaDevices.getUserMedia = async (constraints) => {
    const stream = await original(constraints);

    stream.getVideoTracks().forEach((track) => {
      target.__liveVideoTracks = (target.__liveVideoTracks ?? 0) + 1;

      const stop = track.stop.bind(track);
      track.stop = () => {
        target.__liveVideoTracks = (target.__liveVideoTracks ?? 1) - 1;
        stop();
      };
    });

    return stream;
  };
};

const liveVideoTracks = (page: Page) =>
  page.evaluate(() => {
    const target = window as unknown as { __liveVideoTracks?: number };
    return target.__liveVideoTracks ?? -1;
  });

const openUser = async (
  browser: Browser,
  options: { trackCounter?: boolean } = {}
): Promise<TestUser> => {
  const context = await browser.newContext({
    permissions: ["camera", "microphone"],
  });
  const page = await context.newPage();

  if (options.trackCounter) {
    await page.addInitScript(trackCounterScript);
  }

  page.on("console", (message) => {
    if (message.type() === "error") {
      console.log(`[browser:error] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    console.log(`[pageerror] ${error.message}`);
  });

  await page.goto("/login");
  await page.getByTestId("login-guest").click();
  await expect(page.getByText("Start Chatting")).toBeVisible({
    timeout: 30_000,
  });

  return { context, page };
};

const startVideo = async (page: Page) => {
  await page.getByRole("button", { name: "Start Video Chat" }).click();
};

const startText = async (page: Page) => {
  await page.getByRole("button", { name: "Start Text Chat" }).click();
};

const remoteVideoWidth = (page: Page) =>
  page
    .getByTestId("remote-video")
    .evaluate((element) => (element as HTMLVideoElement).videoWidth);

test.describe("firestore signaling", () => {
  test("matches two strangers, exchanges chat, and cleans up the room", async ({
    browser,
    request,
  }) => {
    await clearRooms(request);

    const creator = await openUser(browser);
    const joiner = await openUser(browser);

    try {
      await startVideo(creator.page);
      await expect(
        creator.page.getByText("Waiting for a stranger to join...")
      ).toBeVisible();

      await startVideo(joiner.page);

      await expect
        .poll(() => remoteVideoWidth(creator.page), { timeout: 60_000 })
        .toBeGreaterThan(0);
      await expect
        .poll(() => remoteVideoWidth(joiner.page), { timeout: 60_000 })
        .toBeGreaterThan(0);

      await creator.page.getByTestId("toggle-chat").click();
      await joiner.page.getByTestId("toggle-chat").click();

      await expect(creator.page.getByTestId("chat-panel")).toHaveAttribute(
        "data-open",
        "true"
      );
      await expect(joiner.page.getByTestId("chat-panel")).toHaveAttribute(
        "data-open",
        "true"
      );

      await creator.page.getByTestId("chat-input").fill("hello from creator");
      await creator.page.getByTestId("send-message").click();
      await expect(
        joiner.page.getByText("hello from creator")
      ).toBeVisible();

      await creator.page.getByTestId("toggle-mic").click();
      await expect(creator.page.getByTestId("toggle-mic")).toHaveAttribute(
        "data-active",
        "false"
      );
      await expect
        .poll(() =>
          creator.page
            .getByTestId("local-video")
            .evaluate((element) => {
              const stream = (element as HTMLVideoElement).srcObject;
              return stream instanceof MediaStream
                ? stream.getAudioTracks()[0]?.enabled
                : undefined;
            })
        )
        .toBe(false);

      // The joiner leaving must put the creator back into the waiting pool.
      await joiner.page.getByTestId("end-chat").click();
      await expect(joiner.page.getByText("Start Chatting")).toBeVisible();
      await expect(
        creator.page.getByText("Waiting for a stranger to join...")
      ).toBeVisible();
      await expect.poll(() => roomCount(request)).toBe(1);

      // The creator leaving must remove the room document entirely.
      await creator.page.getByTestId("end-chat").click();
      await expect(creator.page.getByText("Start Chatting")).toBeVisible();
      await expect.poll(() => roomCount(request)).toBe(0);
    } finally {
      await creator.context.close();
      await joiner.context.close();
    }
  });

  test("text-only chat works without camera or microphone", async ({
    browser,
    request,
  }) => {
    await clearRooms(request);

    const creator = await openUser(browser);
    const joiner = await openUser(browser);

    try {
      await startText(creator.page);
      await expect(
        creator.page.getByText("Waiting for a stranger to join...")
      ).toBeVisible();

      await startText(joiner.page);

      await expect(creator.page.getByTestId("chat-panel")).toHaveAttribute(
        "data-open",
        "true",
        { timeout: 60_000 }
      );
      await expect(joiner.page.getByTestId("chat-panel")).toHaveAttribute(
        "data-open",
        "true",
        { timeout: 60_000 }
      );

      await joiner.page.getByTestId("chat-input").fill("text only works");
      await joiner.page.getByTestId("send-message").click();
      await expect(
        creator.page.getByText("text only works")
      ).toBeVisible();
    } finally {
      await creator.context.close();
      await joiner.context.close();
    }
  });

  test("does not pair a video searcher with a text searcher", async ({
    browser,
    request,
  }) => {
    await clearRooms(request);

    const creator = await openUser(browser);
    const joiner = await openUser(browser);

    try {
      await startVideo(creator.page);
      await expect(
        creator.page.getByText("Waiting for a stranger to join...")
      ).toBeVisible();

      await startText(joiner.page);
      await expect(
        joiner.page.getByText("Waiting for a stranger to join...")
      ).toBeVisible();

      // Both stay in their own pool: the two modes must never be mixed.
      await expect(
        creator.page.getByText("Waiting for a stranger to join...")
      ).toBeVisible();
      await expect.poll(() => roomCount(request)).toBe(2);
    } finally {
      await creator.context.close();
      await joiner.context.close();
    }
  });

  test("two strangers searching at the same time still match", async ({
    browser,
    request,
  }) => {
    await clearRooms(request);

    const first = await openUser(browser);
    const second = await openUser(browser);

    try {
      await Promise.all([startVideo(first.page), startVideo(second.page)]);

      await expect
        .poll(() => remoteVideoWidth(first.page), { timeout: 60_000 })
        .toBeGreaterThan(0);
      await expect
        .poll(() => remoteVideoWidth(second.page), { timeout: 60_000 })
        .toBeGreaterThan(0);

      await expect.poll(() => roomCount(request)).toBe(1);
    } finally {
      await first.context.close();
      await second.context.close();
    }
  });

  test("a failed connection releases the camera", async ({ browser, request }) => {
    test.setTimeout(150_000);
    await clearRooms(request);

    const creator = await openUser(browser, { trackCounter: true });
    const joiner = await openUser(browser, { trackCounter: true });

    try {
      await startVideo(creator.page);
      await startVideo(joiner.page);

      await expect
        .poll(() => remoteVideoWidth(joiner.page), { timeout: 60_000 })
        .toBeGreaterThan(0);

      await expect.poll(() => liveVideoTracks(joiner.page)).toBe(1);

      // The stranger disappears without a graceful teardown.
      await creator.context.close();

      // The joiner lands back in the lobby...
      await expect(joiner.page.getByText("Start Chatting")).toBeVisible({
        timeout: 90_000,
      });

      // ...and must not leave the camera running there.
      await expect.poll(() => liveVideoTracks(joiner.page)).toBe(0);
    } finally {
      await joiner.context.close();
    }
  });

  test("a closed tab releases the stranger instead of leaving stale data", async ({
    browser,
    request,
  }) => {
    test.setTimeout(150_000);
    await clearRooms(request);

    const creator = await openUser(browser);
    const joiner = await openUser(browser);

    try {
      await startVideo(creator.page);
      await expect(
        creator.page.getByText("Waiting for a stranger to join...")
      ).toBeVisible();
      await startVideo(joiner.page);

      await expect
        .poll(() => remoteVideoWidth(creator.page), { timeout: 60_000 })
        .toBeGreaterThan(0);

      // Simulate a crashed tab: no End Chat, no pagehide cleanup.
      await joiner.context.close();

      await expect(
        creator.page.getByText("Waiting for a stranger to join...")
      ).toBeVisible({ timeout: 90_000 });
    } finally {
      await creator.context.close();
    }
  });

  test("next person re-queues the creator and returns the joiner to the lobby", async ({
    browser,
    request,
  }) => {
    await clearRooms(request);

    const creator = await openUser(browser);
    const joiner = await openUser(browser);

    try {
      await startVideo(creator.page);
      await expect(
        creator.page.getByText("Waiting for a stranger to join...")
      ).toBeVisible();
      await startVideo(joiner.page);

      await expect
        .poll(() => remoteVideoWidth(joiner.page), { timeout: 60_000 })
        .toBeGreaterThan(0);

      await creator.page.getByTestId("next-person").click();

      await expect(
        creator.page.getByText("Waiting for a stranger to join...")
      ).toBeVisible();
      await expect(joiner.page.getByText("Start Chatting")).toBeVisible();
    } finally {
      await creator.context.close();
      await joiner.context.close();
    }
  });
});
