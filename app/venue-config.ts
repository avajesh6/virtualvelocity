export const EVENT_NAME = "Velocity Venue";

export const VENUE_ROOMS = [
  { id: "stage", roomName: "velocity-venue-stage", title: "Main stage" },
  { id: "studio", roomName: "velocity-venue-studio", title: "Studio one" },
  { id: "expo", roomName: "velocity-venue-expo", title: "Expo room" },
  { id: "lounge", roomName: "velocity-venue-lounge", title: "Connection lounge" },
] as const;

export type VenueRoomId = (typeof VENUE_ROOMS)[number]["id"];

export function venueRoomById(id: string) {
  return VENUE_ROOMS.find((room) => room.id === id);
}

export function isVenueRoomName(value: unknown): value is string {
  return typeof value === "string" && VENUE_ROOMS.some((room) => room.roomName === value);
}
