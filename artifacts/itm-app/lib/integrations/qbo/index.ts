import { enqueue } from "@/lib/sync";

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

export type OutboxEnqueuedResult = {
  client_uuid: string;
  status: "PENDING";
};

class QBOConnector {
  async createInvoice(params: QBOInvoiceParams): Promise<OutboxEnqueuedResult> {
    const item = await enqueue({
      org_id: params.org_id,
      entity_type: "invoice",
      entity_id: params.report_id,
      operation: "CREATE",
      payload: params as unknown as Record<string, unknown>,
      target_provider: "QBO",
    });
    return { client_uuid: item.client_uuid, status: "PENDING" };
  }

  async voidInvoice(orgId: string, invoiceClientUuid: string): Promise<OutboxEnqueuedResult> {
    const item = await enqueue({
      org_id: orgId,
      entity_type: "invoice",
      entity_id: invoiceClientUuid,
      operation: "DELETE",
      payload: { invoice_client_uuid: invoiceClientUuid },
      target_provider: "QBO",
    });
    return { client_uuid: item.client_uuid, status: "PENDING" };
  }

  async updateInvoice(orgId: string, invoiceClientUuid: string, updates: Partial<QBOInvoiceParams>): Promise<OutboxEnqueuedResult> {
    const item = await enqueue({
      org_id: orgId,
      entity_type: "invoice",
      entity_id: invoiceClientUuid,
      operation: "UPDATE",
      payload: { invoice_client_uuid: invoiceClientUuid, ...updates } as Record<string, unknown>,
      target_provider: "QBO",
    });
    return { client_uuid: item.client_uuid, status: "PENDING" };
  }
}

let connector: QBOConnector | null = null;
export function getQBOConnector(): QBOConnector {
  if (!connector) connector = new QBOConnector();
  return connector;
}
