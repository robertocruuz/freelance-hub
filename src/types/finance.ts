export interface FinanceInvoice {
  id: string;
  name: string | null;
  client_id: string | null;
  project_id: string | null;
  total: number;
  status: string;
  due_date: string | null;
  payment_method: string | null;
  created_at: string;
}

export interface InvoicePrefillDraft {
  sourceTaskId: string;
  invoiceName: string;
  clientId: string;
  projectId: string;
  dueDate: string | null;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
}
