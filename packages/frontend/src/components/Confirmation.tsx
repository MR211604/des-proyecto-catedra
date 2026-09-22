export function Confirmation({
  title,
  text,
  confirm,
  onClose,
  onConfirm,
}: {
  title: string;
  text: string;
  confirm: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="pointer-events-auto w-[min(360px,calc(100vw-2rem))] rounded-xl border border-[#e5cddd] bg-[#fffafd] p-4 text-[#302630] shadow-[0_18px_40px_-20px_#4d3049]">
      <p className="m-0 text-sm font-bold">{title}</p>
      <p className="mt-1 mb-3 text-xs text-[#806f7d]">{text}</p>
      <div className="flex justify-end gap-2">
        <button
          className="rounded-md px-3 py-1.5 text-xs font-bold text-[#806f7d] hover:bg-[#f6edf5] cursor-pointer"
          onClick={onClose}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="rounded-md bg-[#8b5e83] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#70466a] cursor-pointer"
          onClick={onConfirm}
          type="button"
        >
          {confirm}
        </button>
      </div>
    </div>
  );
}
