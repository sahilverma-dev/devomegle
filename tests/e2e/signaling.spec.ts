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

const openUser = async (browser: Browser): Promise<TestUser> => {
  const context = await browser.newContext({
    permissions: ["camera", "microphone"],
  });
  const page = await context.newPage();

  page.on("console", (message) => {
    if (message.type() === "error") {
      console.log(`[browser:error] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    console.log(`[pageerror] ${error.message}`);
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("devomegle:psa-seen", "1");
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
      ).toBeVisible({ timeout: 60_000 });
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
