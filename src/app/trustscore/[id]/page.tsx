"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import Container from "@/components/Container";

interface TrustScoreComponent {
  name: string;
  score: number;
  max_score: number;
  note?: string;
}

interface TrustScoreResponse {
  homestay_id: string;
  total_score: number;
  breakdown: TrustScoreComponent[];
  explanation: string;
}

const TrustScorePage = () => {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<TrustScoreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const res = await api.get<TrustScoreResponse>(`/trustscore/${id}`);
        setData(res.data);
      } catch (e: any) {
        setError(e.response?.data?.detail || "Failed to load TrustScore");
      }
    };
    fetchScore();
  }, [id]);

  if (error) return <Container><p className="text-red-600">{error}</p></Container>;
  if (!data) return <Container><p>Loading TrustScore...</p></Container>;

  return (
    <Container>
      <h1 className="text-3xl font-bold mb-4">TrustScore for Homestay {data.homestay_id}</h1>
      <div className="mb-4">
        <p className="text-xl">Total Score: <strong>{data.total_score}/100</strong></p>
      </div>
      <ul className="space-y-2">
        {data.breakdown.map((comp, idx) => (
          <li key={idx} className="border p-2 rounded">
            <p className="font-semibold">{comp.name}</p>
            <p>Score: {comp.score} / {comp.max_score}</p>
            {comp.note && <p className="text-sm text-gray-600">{comp.note}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-4 p-2 bg-gray-100 rounded">
        <p>{data.explanation}</p>
      </div>
    </Container>
  );
};

export default TrustScorePage;

