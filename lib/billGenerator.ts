import * as Print from "expo-print";
import { supabase } from "@/lib/supabaseClient";

interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface BusinessSettings {
  business_name: string;
  address: string;
  phone_number: string;
}

export const printDirectToThermal = async (
  items: BillItem[],
  billNumber: number,
  paymentMode: "cash" | "upi",
  gstPercentage: number
) => {
  const date = new Date();
  let subTotal = 0;
  let totalQty = 0;

  // Calculate subtotal
  items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    subTotal += itemTotal;
    totalQty += item.quantity;
  });

  // Calculate GST amount and grand total
  const gstAmount = (subTotal * gstPercentage) / 100;
  const grandTotal = subTotal + gstAmount;

  // Fetch business settings from Supabase
  let businessSettings: BusinessSettings = {
    business_name: "Vajanbadhao",
    address: "Shop No 12, RK Heights, MG Road, Pune, MAHARASHTRA",
    phone_number: "9604132864",
  };

  try {
    const { data, error } = await supabase
      .from("business_settings")
      .select("business_name, address, phone_number")
      .eq("id", 1)
      .single();

    if (data && !error) {
      businessSettings = data;
    }
  } catch (error) {
    console.error("Error fetching business settings:", error);
    // Use default values if fetch fails
  }

  const html = `
    <html>
    <head>
      <style>
        body { font-family: monospace; width: 58mm; padding: 5mm; font-size: 9pt; }
        .center { text-align: center; }
        .bold { font-weight: bold; font-size: 14pt; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        td { padding: 2px 0; }
        .line { border-top: 1px dashed #000; margin: 5px 0; }
        .total-row { margin: 3px 0; }
        .right { text-align: right; }
      </style>
    </head>
    <body>
      <div class="center">
        <div class="bold">${businessSettings.business_name}</div>
        <div style="font-size: 8pt;">${businessSettings.address}</div>
        <div style="font-size: 8pt;">Phone: ${
          businessSettings.phone_number
        }</div>
      </div>
      
      <div class="line"></div>
      
      <div>
        <div>Bill No: ${billNumber}</div>
        <div>Date: ${date.toLocaleDateString(
          "en-GB"
        )} ${date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}</div>
      </div>
      
      <div class="line"></div>
      
      <table>
        <tr>
          <td><b>Item Name</b></td>
          <td align="center"><b>Qty</b></td>
          <td align="right"><b>Rate</b></td>
          <td align="right"><b>Total</b></td>
        </tr>
        ${items
          .map((item) => {
            const itemTotal = item.price * item.quantity;
            return `
            <tr>
              <td>${item.product_name}</td>
              <td align="center">${item.quantity}</td>
              <td align="right">${item.price}</td>
              <td align="right">${itemTotal.toFixed(2)}</td>
            </tr>
          `;
          })
          .join("")}
      </table>
      
      <div class="line"></div>
      
      <div>
        <div>Total Items: ${items.length}</div>
        <div>Total Quantity: ${totalQty}</div>
        <div class="total-row">Subtotal: ₹${subTotal.toFixed(2)}</div>
      ${
        gstAmount > 0
          ? `<div class="total-row">GST (${gstPercentage}%): ₹${gstAmount.toFixed(
              2
            )}</div>`
          : ""
      }
        <div class="center bold" style="font-size: 16pt; margin: 8px 0;">Grand Total: ₹${grandTotal.toFixed(
          2
        )}</div>
        <div class="total-row" style="text-align: right;">Received: ₹${grandTotal.toFixed(
          2
        )}</div>
        <div class="total-row" style="text-align: right;">Mode of Payment: ${paymentMode.toUpperCase()}</div>
      </div>
      
      <div class="center" style="margin-top: 10px;">
        <b>THANK YOU VISIT AGAIN</b>
      </div>
    </body>
    </html>
  `;

  await Print.printAsync({ html });
};
