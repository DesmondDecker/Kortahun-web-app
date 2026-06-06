const form = document.getElementById('invoiceForm');
const totalDisplay = document.getElementById('totalDisplay');

const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Live calculation logic
function updateTableTotal() {
    const trips = parseFloat(document.getElementById('trips').value) || 0;
    const price = parseFloat(document.getElementById('unitPrice').value) || 0;
    const total = round(trips * price);
    totalDisplay.innerText = `SLE ${total.toLocaleString()}`;
}

document.getElementById('trips').addEventListener('input', updateTableTotal);
document.getElementById('unitPrice').addEventListener('input', updateTableTotal);

// PDF Generation Logic
async function generatePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Branding
    doc.setFillColor(217, 138, 43); // Kortahun Orange
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('KORTAHUN UNITED', 14, 20);
    doc.setFontSize(10);
    doc.text('Na we dae take n Na we dae go lef', 14, 27);

    // Billing Data
    doc.setTextColor(0, 0, 0);
    doc.text(`Customer: ${data.customerName}`, 14, 60);
    doc.text(`Trips: ${data.trips}`, 14, 67);
    doc.text(`Liters: ${data.liters}`, 14, 74);
    
    // Bank Details
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT DETAILS:', 14, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bank: ${data.bankName}`, 14, 107);
    doc.text(`Account: ${data.accNumber}`, 14, 114);

    doc.save(`Invoice_${data.customerName}.pdf`);
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
        customerName: document.getElementById('custName').value,
        trips: document.getElementById('trips').value,
        unitPrice: document.getElementById('unitPrice').value,
        liters: document.getElementById('liters').value,
        bankName: document.getElementById('bankName').value,
        accNumber: document.getElementById('accNumber').value
    };
    alert('Bill saved to database logic!');
    generatePDF(data);
});