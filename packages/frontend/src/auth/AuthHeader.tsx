import { SignInIcon } from "./AuthIcons.tsx";

type AuthHeaderProps = {
  title: string;
  description: string;
};

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto mb-5 grid size-15 place-items-center rounded-[17px] bg-[#f1e5f0] text-[#8c5e84]">
        <SignInIcon />
      </div>
      <h1 className="text-[clamp(1.65rem,3vw,2rem)] font-bold tracking-[-0.04em] text-[#171318]">
        {title}
      </h1>
      <p className="mt-2 text-[0.97rem] text-[#746a73]">{description}</p>
    </div>
  );
}
