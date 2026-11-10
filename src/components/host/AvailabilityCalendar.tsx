"use client";

import { useState, useEffect, FormEvent, MouseEvent } from "react";
import api from "@/lib/api";

interface BlockedRange {
  start: string; // ISO string
  end: string;
}

interface Availability {
  id: string;
  homestayId: string;
  blockedDates: BlockedRange[];
}

interface Props {
  homestayId: string;
}

export default function AvailabilityCalendar({ homestayId }: Props) {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/availability/${homestayId}/availability`);
      setAvailability(res.data);
      setError(null);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homestayId]);

  const handleBlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!start || !end) return;
    try {
      await api.post(`/api/availability/${homestayId}/availability/block`, {
        start,
        end,
      });
      setStart("");
      setEnd("");
      await fetchAvailability();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to block dates");
    }
  };

  const handleUnblock = (range: BlockedRange) => async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await api.post(`/api/availability/${homestayId}/availability/unblock`, {
        start: range.start,
        end: range.end,
      });
      await fetchAvailability();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to unblock dates");
    }
  };

  if (loading) return <p>Loading availability...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Availability Calendar</h3>
      <p className="mb-2 text-sm text-gray-600">
        Manage blocked dates for this property. Guests cannot book on blocked dates.
      </p>
      <form onSubmit={handleBlock} className="flex gap-2 mb-4">
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="border p-1 rounded"
          required
        />
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="border p-1 rounded"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-3 rounded">
          Block Dates
        </button>
      </form>
      <ul className="list-disc pl-5">
        {availability?.blockedDates?.map((range, idx) => (
          <li key={idx} className="flex items-center justify-between mb-1">
            {new Date(range.start).toLocaleDateString()} – {new Date(range.end).toLocaleDateString()}
            <button
              onClick={handleUnblock(range)}
              className="text-sm text-red-600 underline"
            >
              Unblock
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

