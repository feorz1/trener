import { describe, expect, it } from "vitest";
import {
  addLocalDays,
  generateWorkoutSeriesOccurrences,
  localDateTimeToUtc,
  WorkoutSeriesLocalTimeError,
  WorkoutSeriesRangeError
} from "../src/data/workoutSeriesSchedule";
import { generateLocalWorkoutOccurrences } from "../../src/data/local/workoutSeriesSchedule";

describe("workout series schedule", () => {
  it("generates Monday-Wednesday-Saturday occurrences in chronological order", () => {
    const occurrences = generateWorkoutSeriesOccurrences({
      seriesId: "series-1",
      scheduleVersion: 1,
      timezone: "Europe/Moscow",
      startDate: "2026-08-24",
      throughDate: "2026-09-02",
      slots: [
        { id: "sat", weekday: "saturday", localTime: "12:00" },
        { id: "wed", weekday: "wednesday", localTime: "19:00" },
        { id: "mon", weekday: "monday", localTime: "19:00" }
      ]
    });

    expect(occurrences.map((occurrence) => `${occurrence.scheduledLocalDate} ${occurrence.scheduledLocalTime}`)).toEqual([
      "2026-08-24 19:00",
      "2026-08-26 19:00",
      "2026-08-29 12:00",
      "2026-08-31 19:00",
      "2026-09-02 19:00"
    ]);
    expect(occurrences[0]?.scheduledAt.toISOString()).toBe("2026-08-24T16:00:00.000Z");
  });

  it("crosses month and year boundaries without drifting", () => {
    expect(addLocalDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addLocalDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("keeps the local wall time across daylight-saving transitions", () => {
    expect(localDateTimeToUtc("2026-03-28", "09:00", "Europe/Berlin").toISOString()).toBe("2026-03-28T08:00:00.000Z");
    expect(localDateTimeToUtc("2026-03-30", "09:00", "Europe/Berlin").toISOString()).toBe("2026-03-30T07:00:00.000Z");
  });

  it("rejects nonexistent DST-gap wall times online and locally until a product policy is selected", () => {
    const serverCall = () => generateWorkoutSeriesOccurrences({
      seriesId: "series-gap",
      scheduleVersion: 1,
      timezone: "Europe/Berlin",
      startDate: "2026-03-29",
      throughDate: "2026-03-29",
      slots: [{ id: "slot-gap", weekday: "sunday", localTime: "02:30" }]
    });
    const localCall = () => generateLocalWorkoutOccurrences({
      scheduleVersion: 1,
      timezone: "Europe/Berlin",
      startDate: "2026-03-29",
      throughDate: "2026-03-29",
      slots: [{ id: "slot-gap", weekday: "sunday", localTime: "02:30" }]
    });

    expect(serverCall).toThrow(WorkoutSeriesLocalTimeError);
    expect(localCall).toThrow("does not exist");
  });

  it("rejects occurrence windows large enough to exhaust the process", () => {
    expect(() => generateWorkoutSeriesOccurrences({
      seriesId: "series-large",
      scheduleVersion: 1,
      timezone: "UTC",
      startDate: "2026-01-01",
      throughDate: "2028-01-01",
      slots: [{ id: "slot", weekday: "monday", localTime: "10:00" }]
    })).toThrow(WorkoutSeriesRangeError);
  });

  it("uses the slot id as the stable tie-breaker for equal instants", () => {
    const occurrences = generateWorkoutSeriesOccurrences({
      seriesId: "series-1",
      scheduleVersion: 2,
      timezone: "UTC",
      startDate: "2026-08-24",
      throughDate: "2026-08-24",
      slots: [
        { id: "slot-b", weekday: "monday", localTime: "10:00" },
        { id: "slot-a", weekday: "monday", localTime: "10:00" }
      ]
    });

    expect(occurrences.map((occurrence) => occurrence.seriesSlotId)).toEqual(["slot-a", "slot-b"]);
    expect(occurrences[0]?.occurrenceKey).toBe("v2:slot-a:2026-08-24");
  });
});
