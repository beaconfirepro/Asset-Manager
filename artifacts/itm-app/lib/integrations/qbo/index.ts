function genId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 9); }

export type QBOInvoiceParams = {
  org_id: string;
  hubspot_customer_id: string;
  report_id: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  due_date?: string;
  notes?: string;
};

export type QBOInvoiceResult = {
  invoice_id: string;
  invoice_number: string;
  status: string;
  total: number;
};

class QBOConnector {
  async createInvoice(params: QBOInvoiceParams): Promise<QBOInvoiceResult> {
    console.log("[QBO STUB] createInvoice", params);
    const total = params.line_items.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    );
    return {
      invoice_id: `qbo_inv_${genId()}`,
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      status: "DRAFT",
      total,
    };
  }

  async voidInvoice(invoiceId: string): Promise<void> {
    console.log("[QBO STUB] voidInvoice", invoiceId);
  }

  async getInvoice(invoiceId: string): Promise<QBOInvoiceResult | null> {
    console.log("[QBO STUB] getInvoice", invoiceId);
    return null;
  }

  async handleOutboxItem(
    entityType: string,
    operation: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    console.log("[QBO STUB] handleOutboxItem", { entityType, operation, payload });
    await new Promise((r) => setTimeout(r, 100));
  }
}

let connector: QBOConnector | null = null;

export function getQBOConnector(): QBOConnector {
  if (!connector) connector = new QBOConnector();
  return connector;
}
