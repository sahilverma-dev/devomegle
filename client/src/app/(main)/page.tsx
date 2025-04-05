import Link from "next/link";

const HomeScreen = () => {
  return (
    <div>
      <Link href={"/text"} className="">
        Text
      </Link>
    </div>
  );
};

export default HomeScreen;
