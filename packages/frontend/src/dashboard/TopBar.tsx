import { UserButton } from "@clerk/react";
import { Icon } from "./Icon";

export function TopBar() {
  return (
    <header className="flex h-20 items-center justify-end border-b border-[#d8c9d5] bg-[#fffafd] px-[38px] max-[820px]:h-16 max-[820px]:px-5">
      <div className="flex items-center gap-[25px]">
        <button
          aria-label="Notificaciones"
          className="cursor-pointer border-0 bg-transparent p-1 text-[#332b33]"
          type="button"
        >
          <Icon name="bell" size={24} />
        </button>
        <button
          aria-label="Ayuda"
          className="cursor-pointer border-0 bg-transparent p-1 text-[#332b33]"
          type="button"
        >
          <Icon name="help" size={24} />
        </button>
        <span className="ml-[9px] h-10 w-px bg-[#e8dce6]" />
        <UserButton
          appearance={{ elements: { avatarBox: "!h-[50px] !w-[50px]" } }}
        />
      </div>
    </header>
  );
}
