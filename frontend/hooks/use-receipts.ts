import { useState, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";

export interface Receipt {
  id: string;
  user_id: string;
  image_url: string;
  ocr_status: "pending" | "processing" | "completed" | "failed" | "converted";
  ocr_raw_text: string | null;
  extracted_json: {
    merchant?: string;
    amount?: number;
    date?: string;
    notes?: string;
  } | null;
  created_at: string;
}

export function useUploadReceipt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadReceipt = useCallback(async (file: File): Promise<Receipt> => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetchApi("/receipts/upload", {
        method: "POST",
        body: formData,
      });
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to upload receipt");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { uploadReceipt, loading, error };
}

export function useReceiptStatus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async (id: string): Promise<Receipt> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi(`/receipts/${id}`);
      return response.data;
    } catch (err: any) {
      setError(err.message || "Failed to check receipt status");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { checkStatus, loading, error };
}

export function useConvertReceipt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convertReceipt = useCallback(
    async (
      id: string,
      data: {
        category_id: string;
        amount: number;
        merchant: string;
        date: string;
        notes?: string | null;
      }
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi(`/receipts/${id}/convert`, {
          method: "POST",
          json: data,
        });
        return response.data;
      } catch (err: any) {
        setError(err.message || "Failed to convert receipt to expense");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { convertReceipt, loading, error };
}
