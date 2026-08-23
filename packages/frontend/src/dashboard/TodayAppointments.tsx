import { Icon } from "./Icon";

const appointments = [
  [
    "10:00",
    "AM",
    "Toma de medidas",
    "Sofía Vargas - Vestido Noche",
    "border-[#a36a98]",
  ],
  [
    "14:30",
    "PM",
    "Prueba final",
    "Roberto Gómez - Traje Sastre",
    "border-[#87506a]",
  ],
  ["16:00", "PM", "Entrega", "Lucía Peña - Ajustes Varios", "border-[#d4c4d1]"],
] as const;

export function TodayAppointments() {
  return (
    <section className="overflow-hidden rounded-[9px] border border-[#e8dce6] bg-[#fff7fc] shadow-[0_5px_16px_rgb(75_49_69_/_6%)]">
      <div className="flex min-h-24 items-center justify-between border-b border-[#e8dce6] px-[30px] max-[480px]:px-5">
        <h2 className="m-0 text-[25px] tracking-[-0.5px] max-[480px]:text-[21px]">
          Citas de Hoy
        </h2>
        <button
          aria-label="Agregar cita"
          className="cursor-pointer border-0 bg-transparent p-1 text-[#332b33]"
          type="button"
        >
          <Icon name="plus" size={24} />
        </button>
      </div>
      <div className="grid gap-4 px-5 pt-5 pb-1.5">
        {appointments.map(([time, period, title, detail, tone]) => (
          <article
            className={`flex min-h-[121px] items-center gap-5 rounded-r border-l-4 bg-white px-5 py-[19px] shadow-[0_1px_5px_rgb(70_45_63_/_5%)] max-[480px]:gap-2.5 max-[480px]:px-3 ${tone}`}
            key={title}
          >
            <div className="w-[70px] flex-[0_0_70px] border-r border-[#eee3eb] pr-[18px] text-center max-[480px]:w-[60px] max-[480px]:basis-[60px] max-[480px]:pr-2">
              <strong className="block text-[17px]">{time}</strong>
              <span className="mt-[3px] block text-[13px]">{period}</span>
            </div>
            <div>
              <strong className="block text-[17px] max-[480px]:text-[15px]">
                {title}
              </strong>
              <span className="mt-[7px] block leading-[22px] text-[#4e444b]">
                {detail}
              </span>
            </div>
          </article>
        ))}
      </div>
      <button
        className="mx-5 mb-5 mt-[26px] h-12 w-[calc(100%-40px)] cursor-pointer border border-[#8b5e83] bg-transparent font-bold text-[#8b5e83]"
        type="button"
      >
        Ver Calendario
      </button>
    </section>
  );
}
