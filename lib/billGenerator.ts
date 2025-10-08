import * as Print from "expo-print";

interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  gst: number;
}

export const printDirectToThermal = async (
  items: BillItem[],
  billNumber: number
) => {
  const date = new Date();
  let subTotal = 0;
  let totalGstAmount = 0;
  let totalQty = 0;

  // Calculate subtotal and GST
  items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    const gstAmount = (itemTotal * item.gst) / 100;
    subTotal += itemTotal;
    totalGstAmount += gstAmount;
    totalQty += item.quantity;
  });

  const grandTotal = subTotal + totalGstAmount;

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
      </style>
    </head>
    <body>
      <div class="center">
        <div style="font-size: 8pt;">🍴 KITCHEN LOGO 🍴</div>
        <div class="bold">Vajanbadhao</div>
        <div style="font-size: 8pt;">Shop No 12, RK Heights, MG Road, Pune, MAHARASHTRA</div>
        <div style="font-size: 8pt;">Consumer number:</div>
        <div style="font-size: 8pt;">Phone: 9857387616</div>
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
        <div>Bill To: Cash Sale</div>
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
            const gstAmount = (itemTotal * item.gst) / 100;
            const totalWithGst = itemTotal + gstAmount;
            return `
            <tr>
              <td>${item.product_name}</td>
              <td align="center">${item.quantity}</td>
              <td align="right">${item.price}</td>
              <td align="right">${itemTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding-left: 10px; font-size: 8pt;">GST ${
                item.gst
              }%</td>
              <td align="right" style="font-size: 8pt;">+${gstAmount.toFixed(
                2
              )}</td>
            </tr>
          `;
          })
          .join("")}
      </table>
      
      <div class="line"></div>
      
      <div>
        <div>Total Items: ${items.length}</div>
        <div>Total Quantity: ${totalQty}</div>
        <div style="text-align: right;">Sub Total: ₹${subTotal.toFixed(2)}</div>
        <div style="text-align: right;">Total GST: ₹${totalGstAmount.toFixed(
          2
        )}</div>
        <div class="center bold" style="font-size: 16pt;">Total ₹${grandTotal.toFixed(
          2
        )}</div>
        <div style="text-align: right;">Received: ₹${grandTotal.toFixed(
          2
        )}</div>
        <div style="text-align: right;">Mode of Payment: cash</div>
      </div>
      
      <div class="center" style="margin-top: 10px;">
        <b>THANK YOU VISIT AGAIN</b>
      </div>
    </body>
    </html>
  `;

  await Print.printAsync({ html });
};
