import { UserButton } from "@clerk/react";

export function TopBar() {
  return (
    <header className="flex h-20 items-center justify-end border-b border-[#d8c9d5] bg-[#fffafd] px-9.5 max-[820px]:h-16 max-[820px]:px-5">
      <div className="flex items-center gap-6.25">
        <span className="ml-2.25 h-10 w-px bg-[#e8dce6]" />
        <UserButton
          appearance={{ elements: { avatarBox: "!h-[50px] !w-[50px]" } }}
        />
      </div>
    </header>
  );
}
