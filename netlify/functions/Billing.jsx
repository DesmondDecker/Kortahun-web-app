// src/pages/Billing.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Heading, Text, Button, Input, Select, HStack, VStack, Card, CardBody,
  CardHeader, Table, Thead, Tbody, Tr, Th, Td, Badge, IconButton, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  ModalFooter, FormControl, FormLabel, FormErrorMessage, Textarea,
  useDisclosure, useToast, Spinner, Center, Alert, AlertIcon,
  SimpleGrid, Stat, StatLabel, StatNumber, Flex, NumberInput,
  NumberInputField, NumberInputStepper, NumberIncrementStepper,
  NumberDecrementStepper, Divider, Tooltip,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, EditIcon, DownloadIcon, ViewIcon, CheckIcon } from '@chakra-ui/icons';
import { bills, customers, deliveryNotes } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SLE = n => `SLE ${Number(n||0).toLocaleString('en-SL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATUSES = ['Proforma','Pending','Paid','Overdue','Cancelled'];
const METHODS  = ['Cash','Card','Bank Transfer','Mobile Money','Check','Credit'];

const BANK_DETAILS = {
  bank: 'Sierra Leone Commercial Bank',
  accountName: 'Kortahun United Services',
  accountNumber: '003001234567890123',
  swift: 'SLCBSLFM',
  branch: 'Siaka Stevens Street',
};

const emptyItem = { description: '', liters: 0, unitPrice: 0, totalPrice: 0 };
const emptyForm = {
  customer: '', description: '', lineItems: [{ ...emptyItem }],
  additionalCharges: 0, discount: 0, tax: 0, trips: 1, liters: 0,
  status: 'Pending', paymentMethod: 'Cash', dueDate: '', notes: '',
  transactionId: '', paymentDate: '',
};

// Generate PDF client-side using jsPDF
async function generatePDF(bill) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const orange = [217, 138, 43];
  const black  = [17, 17, 17];
  const white  = [255, 255, 255];

  // Header band
  doc.setFillColor(...orange);
  doc.rect(0, 0, 210, 45, 'F');

  // Company name
  doc.setTextColor(...white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('KORTAHUN UNITED', 14, 20);

  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Water & Sewage Management — Freetown, Sierra Leone', 14, 28);
  doc.text('+232 76 000 000 | info@kortahun.com', 14, 35);

  // INVOICE label
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(bill.status === 'Proforma' ? 'PROFORMA INVOICE' : 'TAX INVOICE', 196, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.billNumber || 'DRAFT', 196, 28, { align: 'right' });
  doc.text(new Date(bill.createdAt).toLocaleDateString('en-GB'), 196, 35, { align: 'right' });

  // Bill To
  doc.setTextColor(...black);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 14, 58);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(bill.customer?.name || '—', 14, 65);
  doc.text(bill.customer?.phone || '', 14, 71);
  doc.text(bill.customer?.email || '', 14, 77);
  doc.text(bill.customer?.address || '', 14, 83);

  // Bill Info
  doc.setFont('helvetica', 'bold');
  doc.text('BILL INFO:', 130, 58);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${bill.status}`, 130, 65);
  doc.text(`Method: ${bill.paymentMethod}`, 130, 71);
  if (bill.dueDate) doc.text(`Due: ${new Date(bill.dueDate).toLocaleDateString('en-GB')}`, 130, 77);
  if (bill.trips)   doc.text(`Trips: ${bill.trips}`, 130, 83);
  if (bill.liters)  doc.text(`Liters: ${bill.liters.toLocaleString()}`, 130, 89);

  // Line Items Table
  const rows = (bill.lineItems || []).map(i => [
    i.description, i.liters, SLE(i.unitPrice), SLE(i.totalPrice),
  ]);

  autoTable(doc, {
    startY: 98,
    head: [['Description', 'Qty', 'Unit Price (SLE)', 'Total (SLE)']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: orange, textColor: white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [254, 248, 240] },
    styles: { fontSize: 10 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // Bank Details (Left side)
  doc.setFontSize(9);
  doc.setTextColor(...black);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS (BANK TRANSFER):', 14, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Bank: ${BANK_DETAILS.bank}`, 14, finalY + 5);
  doc.text(`Account Name: ${BANK_DETAILS.accountName}`, 14, finalY + 10);
  doc.text(`Account Number: ${BANK_DETAILS.accountNumber}`, 14, finalY + 15);
  doc.text(`SWIFT/Branch: ${BANK_DETAILS.swift} / ${BANK_DETAILS.branch}`, 14, finalY + 20);

  // Totals
  const totalsData = [
    ['Subtotal', SLE(bill.subtotal)],
  ];
  if (bill.additionalCharges) totalsData.push(['Additional Charges', SLE(bill.additionalCharges)]);
  if (bill.discount)          totalsData.push(['Discount', `- ${SLE(bill.discount)}`]);
  if (bill.tax)               totalsData.push(['Tax', SLE(bill.tax)]);
  totalsData.push(['TOTAL', SLE(bill.total)]);

  autoTable(doc, {
    startY: finalY - 5,
    body: totalsData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { halign: 'right', fontStyle: 'bold', cellWidth: 140 },
      1: { halign: 'right', cellWidth: 50 },
    },
    didDrawCell: (data) => {
      if (data.row.index === totalsData.length - 1) {
        doc.setFillColor(...orange);
      }
    },
    willDrawCell: (data) => {
      if (data.row.index === totalsData.length - 1) {
        doc.setTextColor(...white);
        doc.setFillColor(...orange);
      }
    },
  });

  // Notes
  if (bill.notes) {
    const noteY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 14, noteY);
    doc.setFont('helvetica', 'normal');
    doc.text(bill.notes, 14, noteY + 6, { maxWidth: 180 });
  }

  // Footer
  const pageH = doc.internal.pageSize.height;
  doc.setFillColor(240, 240, 240);
  doc.rect(0, pageH - 20, 210, 20, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for choosing Kortahun United — Freetown, Sierra Leone', 105, pageH - 12, { align: 'center' });
  doc.text('This is a computer-generated document.', 105, pageH - 7, { align: 'center' });

  doc.save(`${bill.billNumber || 'bill'}.pdf`);
}

function LineItemsEditor({ items, onChange }) {
  const add = () => onChange([...items, { ...emptyItem }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const next = items.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: val };
      if (field === 'liters' || field === 'unitPrice') {
        updated.totalPrice = (parseFloat(updated.liters)||0) * (parseFloat(updated.unitPrice)||0);
      }
      return updated;
    });
    onChange(next);
  };

  return (
    <Box>
      <Table size="sm" variant="simple">
        <Thead bg="gray.50">
          <Tr>
            <Th>Description</Th>
            <Th w="80px">Liters</Th>
            <Th w="130px">Unit Price (SLE)</Th>
            <Th w="130px">Total</Th>
            <Th w="40px" />
          </Tr>
        </Thead>
        <Tbody>
          {items.map((item, i) => (
            <Tr key={i}>
              <Td>
                <Input size="sm" value={item.description}
                  onChange={e => update(i, 'description', e.target.value)}
                  placeholder="Service description" />
              </Td>
              <Td>
                <NumberInput size="sm" min={0} value={item.liters}
                  onChange={v => update(i, 'liters', parseFloat(v)||0)}>
                  <NumberInputField />
                  <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                </NumberInput>
              </Td>
              <Td>
                <NumberInput size="sm" min={0} value={item.unitPrice}
                  onChange={v => update(i, 'unitPrice', parseFloat(v)||0)}>
                  <NumberInputField />
                  <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                </NumberInput>
              </Td>
              <Td fontSize="sm" fontWeight="semibold" color="brand.600">
                {SLE(item.totalPrice || (item.liters * item.unitPrice))}
              </Td>
              <Td>
                {items.length > 1 && (
                  <IconButton icon={<DeleteIcon />} size="xs" colorScheme="red" variant="ghost"
                    onClick={() => remove(i)} aria-label="Remove" />
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Button size="sm" variant="ghost" colorScheme="brand" leftIcon={<AddIcon />} mt={2} onClick={add}>
        Add Line Item
      </Button>
    </Box>
  );
}

function BillForm({ initial, customerList, onSave, onCancel, loading }) {
  const [form,   setForm]   = useState(initial || emptyForm);
  const [errors, setErrors] = useState({});
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  const subtotal = (form.lineItems || []).reduce((s, i) => s + round((parseFloat(i.liters||0) * parseFloat(i.unitPrice||0))), 0);
  const rawTotal = subtotal + (parseFloat(form.additionalCharges)||0) - (parseFloat(form.discount)||0) + (parseFloat(form.tax)||0);
  const total    = round(rawTotal);

  const validate = () => {
    const e = {};
    if (!form.customer) e.customer = 'Customer is required';
    if (!(form.lineItems||[]).length) e.lineItems = 'At least one line item is required';
    const badItems = (form.lineItems||[]).filter(i => !i.description?.trim());
    if (badItems.length) e.lineItems = 'All line items need a description';
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <VStack spacing={5} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isInvalid={!!errors.customer} isRequired>
          <FormLabel fontSize="sm">Customer</FormLabel>
          <Select value={form.customer} onChange={e => set('customer', e.target.value)} placeholder="Select customer">
            {customerList.map(c => <option key={c._id} value={c._id}>{c.name} — {c.phone}</option>)}
          </Select>
          <FormErrorMessage>{errors.customer}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Status</FormLabel>
          <Select value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Payment Method</FormLabel>
          <Select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Due Date</FormLabel>
          <Input type="date" value={form.dueDate?.split('T')[0]||''} onChange={e => set('dueDate', e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Transaction ID (Payment Ref)</FormLabel>
          <Input value={form.transactionId} onChange={e => set('transactionId', e.target.value)} placeholder="e.g. BB12345" />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Payment Date</FormLabel>
          <Input type="date" value={form.paymentDate?.split('T')[0]||''} onChange={e => set('paymentDate', e.target.value)} />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Number of Trips</FormLabel>
          <NumberInput min={1} value={form.trips} onChange={v => set('trips', parseInt(v)||1)}>
            <NumberInputField />
            <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
          </NumberInput>
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Liters Delivered</FormLabel>
          <NumberInput min={0} value={form.liters} onChange={v => set('liters', parseFloat(v)||0)}>
            <NumberInputField />
            <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
          </NumberInput>
        </FormControl>
      </SimpleGrid>

      <FormControl isInvalid={!!errors.lineItems}>
        <FormLabel fontSize="sm">Line Items</FormLabel>
        <LineItemsEditor
          items={form.lineItems || [{ ...emptyItem }]}
          onChange={v => set('lineItems', v)}
        />
        <FormErrorMessage>{errors.lineItems}</FormErrorMessage>
      </FormControl>

      <Divider />

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm">Additional Charges (SLE)</FormLabel>
          <NumberInput min={0} value={form.additionalCharges} onChange={v => set('additionalCharges', parseFloat(v)||0)}>
            <NumberInputField />
            <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Discount (SLE)</FormLabel>
          <NumberInput min={0} value={form.discount} onChange={v => set('discount', parseFloat(v)||0)}>
            <NumberInputField />
            <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
          </NumberInput>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Tax (SLE)</FormLabel>
          <NumberInput min={0} value={form.tax} onChange={v => set('tax', parseFloat(v)||0)}>
            <NumberInputField />
            <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
          </NumberInput>
        </FormControl>
      </SimpleGrid>

      {/* Total Preview */}
      <Box bg="brand.50" p={4} borderRadius="lg" border="1px solid" borderColor="brand.200">
        <HStack justify="space-between">
          <Text fontWeight="bold" color="brand.700">Estimated Total:</Text>
          <Text fontWeight="bold" fontSize="xl" color="brand.600">{SLE(total)}</Text>
        </HStack>
      </Box>

      <FormControl>
        <FormLabel fontSize="sm">Notes</FormLabel>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Additional notes..." />
      </FormControl>

      <HStack justify="flex-end" pt={2}>
        <Button variant="ghost" onClick={onCancel} isDisabled={loading}>Cancel</Button>
        <Button colorScheme="brand" onClick={() => { if (validate()) onSave(form); }} isLoading={loading}>Save Bill</Button>
      </HStack>
    </VStack>
  );
}

async function generateDeliveryNotePDF(dn) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();
  const orange = [217, 138, 43];

  doc.setFillColor(...orange);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('KORTAHUN UNITED', 14, 20);
  doc.setFontSize(10);
  doc.text('DELIVERY NOTE', 196, 20, { align: 'right' });
  doc.text(dn.noteNumber, 196, 28, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('DELIVER TO:', 14, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(dn.customer?.name || '', 14, 62);
  doc.text(dn.customer?.address || '', 14, 68);

  autoTable(doc, {
    startY: 80,
    head: [['Item Description', 'Liters', 'Delivered Qty', 'Condition']],
    body: dn.items.map(i => [i.description, i.liters, '[   ]', 'Good / ____']),
    theme: 'grid',
    headStyles: { fillColor: orange },
  });

  const finalY = doc.lastAutoTable.finalY + 20;
  doc.text('Driver Signature: ____________________', 14, finalY);
  doc.text('Customer Signature: ____________________', 120, finalY);
  
  doc.save(`${dn.noteNumber}.pdf`);
}

export default function Billing() {
  const { user } = useAuth();
  const toast = useToast();
  const [list,         setList]         = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [analytics,    setAnalytics]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [viewing,      setViewing]      = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);

  const { isOpen: isFormOpen, onOpen: openForm, onClose: closeForm } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: openView, onClose: closeView } = useDisclosure();
  const limit = 25;

  const isObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      const res = await bills.list(params);
      setList(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      toast({ title: 'Error loading bills', description: e.message, status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await bills.allCustomers();
      setCustomerList(res.data || []);
    } catch {}
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await bills.analytics();
      setAnalytics(res.data);
    } catch {}
  }, []);

  useEffect(() => { loadBills(); }, [loadBills]);
  useEffect(() => { loadCustomers(); loadAnalytics(); }, [loadCustomers, loadAnalytics]);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const data = { ...form, createdBy: user?.username || 'System' };
      // Fix: Ensure selected._id is a valid ID string, not 'undefined' or null/empty
      // This prevents sending PUT requests to /api/bills/undefined
      if (selected && selected._id && typeof selected._id === 'string' && selected._id !== 'undefined') {
        await bills.update(selected._id, data);
        toast({ title: 'Bill updated', status: 'success', duration: 2000 });
      } else {
        await bills.create(data);
        toast({ title: 'Bill created', status: 'success', duration: 2000 });
      }
      closeForm();
      setSelected(null);
      loadBills();
      loadAnalytics();
    } catch (e) {
      toast({ title: 'Error', description: e.message, status: 'error', duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    // Fix: Ensure ID is valid before attempting deletion
    if (!id || id === 'undefined') {
      toast({ title: 'Error', description: 'Invalid bill ID for deletion', status: 'error' });
      return;
    }
    if (!window.confirm('Delete this bill permanently?')) return;
    try {
      await bills.remove(id);
      toast({ title: 'Bill deleted', status: 'info', duration: 2000 });
      loadBills();
      loadAnalytics();
    } catch (e) {
      toast({ title: 'Error', description: e.message, status: 'error', duration: 3000 });
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const blob = await bills.exportCSV();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bills.csv';
      a.click();
    } catch (e) {
      toast({ title: 'CSV export failed', description: e.message, status: 'error', duration: 3000 });
    }
  };

  const totalPages = Math.ceil(total / limit);
  const at = analytics?.totals;

  return (
    <Box p={{ base: 4, md: 6 }}>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Box>
          <Heading size="lg">Billing</Heading>
          <Text color="gray.500" fontSize="sm">{total} total invoices</Text>
        </Box>
        <HStack spacing={3}>
          <Button size="sm" variant="outline" leftIcon={<DownloadIcon />} onClick={handleDownloadCSV}>CSV</Button>
          <Button colorScheme="purple" size="sm" leftIcon={<AddIcon />}
            onClick={() => { setSelected({ ...emptyForm, status: 'Proforma' }); openForm(); }}>
            New Proforma
          </Button>
          <Button colorScheme="brand" size="sm" leftIcon={<AddIcon />}
            onClick={() => { setSelected(null); openForm(); }}>
            New Invoice
          </Button>
        </HStack>
      </Flex>

      {/* Analytics cards */}
      {at && (
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={5}>
          {[
            { label:'Total Bills',   val: at.totalBills || 0,          color:'blue',   isCurr: false },
            { label:'Total Revenue', val: SLE(at.totalRevenue),        color:'brand',  isCurr: true  },
            { label:'Avg Bill',      val: SLE(at.avgBill),             color:'purple', isCurr: true  },
            { label:'Total Trips',   val: at.totalTrips || 0,          color:'teal',   isCurr: false },
          ].map(s => (
            <Card key={s.label} shadow="sm" borderRadius="lg">
              <CardBody py={3}>
                <Stat>
                  <StatLabel fontSize="xs" color="gray.500">{s.label}</StatLabel>
                  <StatNumber fontSize={{ base:'md', md:'xl' }} color={`${s.color}.500`}>{s.val}</StatNumber>
                </Stat>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Filters */}
      <Card shadow="sm" borderRadius="xl" mb={5}>
        <CardBody>
          <HStack>
            <Select maxW="180px" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </HStack>
        </CardBody>
      </Card>

      {/* Table */}
      <Card shadow="md" borderRadius="xl" overflowX="auto">
        <CardBody p={0}>
          {loading ? (
            <Center py={12}><Spinner color="brand.500" size="xl" /></Center>
          ) : list.length === 0 ? (
            <Center py={12}><VStack><Text fontSize="4xl">💰</Text><Text color="gray.400">No bills found. Create your first invoice!</Text></VStack></Center>
          ) : (
            <Table>
              <Thead bg="gray.50">
                <Tr>
                  <Th>Bill #</Th>
                  <Th>Customer</Th>
                  <Th>Trips/Liters</Th>
                  <Th isNumeric>Total</Th>
                  <Th>Method</Th>
                  <Th>Status</Th>
                  <Th>Due</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {list.map(b => (
                  <Tr key={b._id} _hover={{ bg:'gray.50' }}>
                    <Td fontFamily="mono" fontSize="xs">{b.billNumber || 'DRAFT'}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="semibold" fontSize="sm">{b.customer?.name || '—'}</Text>
                        <Text fontSize="xs" color="gray.500">{b.customer?.phone}</Text>
                      </VStack>
                    </Td>
                    <Td fontSize="xs">
                      {b.trips > 0 && <Text>🚛 {b.trips} trips</Text>}
                      {b.liters > 0 && <Text>💧 {b.liters?.toLocaleString()}L</Text>}
                    </Td>
                    <Td isNumeric fontWeight="bold" color="brand.600">{SLE(b.total)}</Td>
                    <Td fontSize="xs">{b.paymentMethod}</Td>
                    <Td>
                      <Badge borderRadius="full" px={2} colorScheme={
                        b.status === 'Paid' ? 'green' : 
                        b.status === 'Proforma' ? 'purple' : 
                        b.status === 'Overdue' ? 'red' : 
                        b.status === 'Cancelled' ? 'gray' : 'yellow'
                      }>{b.status}</Badge>
                    </Td>
                    <Td fontSize="xs" color={b.dueDate && new Date(b.dueDate)<new Date() && b.status==='Pending'?'red.500':'gray.500'}>
                      {b.dueDate ? new Date(b.dueDate).toLocaleDateString('en-GB') : '—'}
                    </Td>
                    <Td>
                      <HStack>
                        <Tooltip label="View / Download PDF">
                          <IconButton icon={<ViewIcon />} size="sm" variant="ghost" colorScheme="blue"
                            onClick={() => { setViewing(b); openView(); }} aria-label="View" />
                        </Tooltip>
                        <Tooltip label="Delivery Note">
                          <IconButton icon={<CheckIcon />} size="sm" variant="ghost" colorScheme="teal"
                            onClick={async () => {
                              if (!isObjectId(b._id)) {
                                toast({ title: 'Error', description: 'Invalid bill ID', status: 'error' });
                                return;
                              }
                              try {
                                const res = await deliveryNotes.getForBill(b._id);
                                generateDeliveryNotePDF(res.data);
                              } catch (e) {
                                toast({ title: 'Error', description: e.message, status: 'error' });
                              }
                            }} aria-label="Delivery Note" />
                        </Tooltip>
                        <Tooltip label="Edit">
                          <IconButton icon={<EditIcon />} size="sm" variant="ghost" colorScheme="brand"
                            onClick={() => {
                              // Ensure we only pass a valid ObjectId string to the form state
                              // If the current value is a name string or invalid, fallback to empty
                              const cid = typeof b.customer === 'object' ? b.customer?._id : b.customer;
                              setSelected({ ...b, customer: isObjectId(cid) ? cid : '' });
                              openForm();
                            }} aria-label="Edit" />
                        </Tooltip>
                        <Tooltip label="Delete">
                          <IconButton icon={<DeleteIcon />} size="sm" variant="ghost" colorScheme="red"
                            onClick={() => handleDelete(b._id)} aria-label="Delete" />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <HStack justify="center" mt={4}>
          <Button size="sm" isDisabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</Button>
          <Text fontSize="sm" color="gray.600">Page {page} of {totalPages}</Text>
          <Button size="sm" isDisabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Next →</Button>
        </HStack>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={isFormOpen} onClose={() => { closeForm(); setSelected(null); }} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>{selected ? 'Edit Bill' : 'New Bill'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <BillForm
              initial={selected || emptyForm}
              customerList={customerList}
              onSave={handleSave}
              onCancel={() => { closeForm(); setSelected(null); }}
              loading={saving}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* View / PDF Modal */}
      <Modal isOpen={isViewOpen} onClose={closeView} size="2xl">
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>
            <HStack>
              <Text>Bill: {viewing?.billNumber || 'DRAFT'}</Text>
              <Badge colorScheme={viewing?.status==='Paid'?'green':viewing?.status==='Overdue'?'red':'yellow'}>
                {viewing?.status}
              </Badge>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {viewing && (
              <VStack align="stretch" spacing={4}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <Card variant="outline" size="sm">
                    <CardHeader py={2} bg="gray.50"><Text fontSize="xs" fontWeight="bold">CUSTOMER DETAILS</Text></CardHeader>
                    <CardBody>
                      <Text fontWeight="bold">{viewing.customer?.name}</Text>
                      <Text fontSize="sm">{viewing.customer?.phone}</Text>
                      <Text fontSize="sm" color="gray.600">{viewing.customer?.address}</Text>
                    </CardBody>
                  </Card>
                  <Card variant="outline" size="sm">
                    <CardHeader py={2} bg="gray.50"><Text fontSize="xs" fontWeight="bold">PAYMENT & STATUS</Text></CardHeader>
                    <CardBody>
                      <HStack justify="space-between"><Text fontSize="sm">Status:</Text><Badge colorScheme={viewing.status === 'Paid' ? 'green' : 'orange'}>{viewing.status}</Badge></HStack>
                      <HStack justify="space-between"><Text fontSize="sm">Method:</Text><Text fontSize="sm">{viewing.paymentMethod}</Text></HStack>
                      {viewing.transactionId && (
                        <HStack justify="space-between"><Text fontSize="sm">Ref ID:</Text><Text fontSize="sm" fontWeight="mono">{viewing.transactionId}</Text></HStack>
                      )}
                      {viewing.paymentDate && (
                        <HStack justify="space-between"><Text fontSize="sm">Paid On:</Text><Text fontSize="sm">{new Date(viewing.paymentDate).toLocaleDateString('en-GB')}</Text></HStack>
                      )}
                    </CardBody>
                  </Card>
                </SimpleGrid>

                <Divider />

                <Table size="sm">
                  <Thead bg="gray.50">
                    <Tr><Th>Description</Th><Th isNumeric>Qty</Th><Th isNumeric>Unit</Th><Th isNumeric>Total</Th></Tr>
                  </Thead>
                  <Tbody>
                    {(viewing.lineItems||[]).map((item, i) => (
                      <Tr key={i}>
                        <Td>{item.description}</Td>
                        <Td isNumeric>{item.quantity}</Td>
                        <Td isNumeric>{SLE(item.unitPrice)}</Td>
                        <Td isNumeric fontWeight="semibold">{SLE(item.totalPrice)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>

                <Box p={3} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
                  <Text fontSize="xs" fontWeight="bold" color="blue.700" mb={1}>OFFICIAL BANK DETAILS</Text>
                  <SimpleGrid columns={2} spacing={2} fontSize="xs">
                    <Text color="gray.600">Bank:</Text><Text fontWeight="semibold">{BANK_DETAILS.bank}</Text>
                    <Text color="gray.600">Account Name:</Text><Text fontWeight="semibold">{BANK_DETAILS.accountName}</Text>
                    <Text color="gray.600">Account Number:</Text><Text fontWeight="bold" color="blue.800">{BANK_DETAILS.accountNumber}</Text>
                    <Text color="gray.600">Branch/Swift:</Text><Text fontWeight="semibold">{BANK_DETAILS.branch} / {BANK_DETAILS.swift}</Text>
                  </SimpleGrid>
                </Box>

                <Box bg="brand.50" p={4} borderRadius="lg" border="1px" borderColor="brand.200">
                  <VStack align="stretch" spacing={1}>
                    <HStack justify="space-between"><Text fontSize="sm">Subtotal</Text><Text fontSize="sm">{SLE(viewing.subtotal)}</Text></HStack>
                    {viewing.additionalCharges > 0 && <HStack justify="space-between"><Text fontSize="sm">Additional</Text><Text fontSize="sm">{SLE(viewing.additionalCharges)}</Text></HStack>}
                    {viewing.discount > 0 && <HStack justify="space-between"><Text fontSize="sm">Discount</Text><Text fontSize="sm" color="red.500">- {SLE(viewing.discount)}</Text></HStack>}
                    {viewing.tax > 0 && <HStack justify="space-between"><Text fontSize="sm">Tax</Text><Text fontSize="sm">{SLE(viewing.tax)}</Text></HStack>}
                    <Divider />
                    <HStack justify="space-between"><Text fontWeight="bold">TOTAL</Text><Text fontWeight="bold" fontSize="xl" color="brand.600">{SLE(viewing.total)}</Text></HStack>
                  </VStack>
                </Box>

                {viewing.notes && <Box><Text fontSize="xs" color="gray.500">Notes</Text><Text fontSize="sm">{viewing.notes}</Text></Box>}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button onClick={closeView} variant="ghost">Close</Button>
              <Button colorScheme="brand" leftIcon={<DownloadIcon />} onClick={() => generatePDF(viewing)}>
                Download PDF
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
