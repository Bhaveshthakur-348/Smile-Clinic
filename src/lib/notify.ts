import "server-only";

/**
 * Hook for booking notifications.
 * Phase 3: send the WhatsApp confirmation template to the patient and alert reception.
 * For now it only logs, so the booking flow works without WhatsApp set up.
 */
export async function notifyNewBooking(bookingId: string) {
  console.info(`[notify] new booking ${bookingId} — WhatsApp confirmation pending (Phase 3)`);
}

export async function notifyBookingChanged(bookingId: string, change: "rescheduled" | "cancelled") {
  console.info(`[notify] booking ${bookingId} ${change} — WhatsApp update pending (Phase 3)`);
}
