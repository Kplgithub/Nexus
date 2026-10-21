import { whatsappLink } from '@nexus/shared';
import { PhoneIcon, WhatsAppIcon } from '../icons';

/**
 * Small floating call / WhatsApp buttons. Kept to the bottom-right corner, with
 * page padding below so they never cover footer links or form buttons.
 */
export function FloatingContact({
  phone,
  whatsapp,
  message,
}: {
  phone: string;
  whatsapp: string;
  message?: string;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-30 flex flex-col gap-3 print:hidden">
      <a
        href={whatsappLink(whatsapp, message ?? 'Hello NEXUS Estate, I am looking for a property.')}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="pointer-events-auto grid size-13 place-items-center rounded-full bg-[#25D366] text-white shadow-lift transition-transform hover:scale-105"
      >
        <WhatsAppIcon size={26} />
      </a>
      <a
        href={`tel:${phone}`}
        aria-label="Call NEXUS Estate"
        className="pointer-events-auto grid size-13 place-items-center rounded-full bg-brand text-white shadow-lift transition-transform hover:scale-105 md:hidden"
      >
        <PhoneIcon size={22} />
      </a>
    </div>
  );
}
