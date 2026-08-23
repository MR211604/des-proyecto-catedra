import { Icon, type IconName } from "./Icon";

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
  tone?: "danger";
};

export function StatCard({ label, value, detail, icon, tone }: StatCardProps) {
  return (
    <article className="min-h-[232px] rounded-[9px] border border-[#e8dce6] bg-[#fff7fc] px-[30px] py-[29px] shadow-[0_5px_16px_rgb(75_49_69_/_6%)] max-[1100px]:px-5 max-[1100px]:py-6 max-[480px]:min-h-[190px]">
      <div className="flex items-start justify-between gap-3 text-lg leading-6">
        <span>{label}</span>
        <div className="grid h-[60px] w-[60px] flex-[0_0_60px] place-items-center rounded-md bg-[#fcf1fa] text-[#8b5e83]">
          <Icon name={icon} size={25} />
        </div>
      </div>
      <strong className="mt-6 block text-5xl leading-none tracking-[-1.5px] max-[480px]:mt-[17px] max-[480px]:text-[42px]">
        {value}
      </strong>
      <span
        className={`mt-3.5 block text-base text-[#8b5e83] ${tone === "danger" ? "text-[#ba1a1a]" : ""}`}
      >
        {detail}
      </span>
    </article>
  );
}
