import {
  Box, VStack, Text, Heading, Accordion, AccordionItem,
  AccordionButton, AccordionPanel, AccordionIcon,
  Badge, Grid, GridItem, Code, Divider, HStack,
} from '@chakra-ui/react';

const SECTIONS = [
  { icon:'🚀', title:'Getting Started', color:'blue', items:[
    { heading:'Login & First Setup', body:'Default accounts: admin / admin123 (Admin), operator / operator123 (Operator). After login, go to Settings → Company and fill in your company name, address, currency, and unit prices. These print on all invoices.' },
    { heading:'Navigation', body:'Use the sidebar to move between modules. The sidebar can be collapsed to icon-only mode for more screen space. On mobile, tap the hamburger menu to open the drawer.' },
  ]},
  { icon:'👥', title:'Customers', color:'green', items:[
    { heading:'Adding Customers', body:'Go to Customers → Add Customer. Required fields: Name, Email, Phone, Address, and at least one Service (Water or Sewage). Meter number and connection date are optional.' },
    { heading:'Customer Status', body:'Active — normal service. Inactive — temporarily paused. Suspended — overdue or policy breach.' },
  ]},
  { icon:'💰', title:'Billing', color:'purple', items:[
    { heading:'Creating Bills', body:'Go to Billing → Create Bill. Select a customer, add line items with descriptions and quantities, then add any additional charges, discounts, or tax. Bill numbers are auto-generated.' },
    { heading:'Marking as Paid', body:'Open a bill and click "Mark as Paid". Select the payment method and transaction ID. The status updates to Paid and the payment date is recorded.' },
  ]},
  { icon:'🚚', title:'Deliveries', color:'blue', items:[
    { heading:'Recording a Delivery', body:'Go to Deliveries → New Delivery. Select customer, vehicle, driver, service type, trips, quantity, and cash received. Total amount and outstanding balance are calculated automatically.' },
    { heading:'Payment Tracking', body:'Each delivery tracks: Total Amount, Cash Received, and Outstanding Balance. Status is Paid when fully settled, Partial if partially paid, Unpaid if nothing received.' },
  ]},
  { icon:'🚛', title:'Vehicles & Drivers', color:'orange', items:[
    { heading:'Fleet Management', body:'Manage your tanker fleet under Vehicles. Track vehicle number, type, capacity, fuel type, and status. Vehicles can be assigned to specific drivers.' },
    { heading:'Driver Roster', body:'Add drivers with their license numbers and contact details. Drivers can be linked to vehicles for delivery tracking.' },
  ]},
  { icon:'💳', title:'Payments', color:'teal', items:[
    { heading:'Recording Payments', body:'Go to Payments → Record Payment. Select the customer, optionally link to a specific delivery, enter the amount and payment method (Cash, Bank Transfer, or Mobile Money).' },
    { heading:'Payment History', body:'All payments are listed with date, customer, amount, and method. You can search and filter by method.' },
  ]},
  { icon:'📉', title:'Expenses', color:'red', items:[
    { heading:'Tracking Expenses', body:'Record business expenses under Expenses. Categories: Fuel, Maintenance, Repairs, Salaries, Tools & Equipment, Office Supplies, Vehicle Insurance, Permits & Licenses, and Other.' },
    { heading:'Analytics', body:'The Analytics tab shows a pie chart breakdown by category and a sorted list of expenses by category to identify your biggest cost centres.' },
  ]},
  { icon:'📈', title:'Reports', color:'cyan', items:[
    { heading:'Summary Dashboard', body:'The Reports page shows total revenue, deliveries, outstanding balances, and active customers for any date range you select.' },
    { heading:'Charts', body:'Revenue chart shows monthly income trends. Delivery chart shows volume over time. Service Mix shows the split between Water Supply and Sewage Disposal.' },
    { heading:'Export', body:'Click Export CSV on any chart or table to download the data for use in Excel or Google Sheets.' },
  ]},
  { icon:'🗺️', title:'GIS Pricing', color:'teal', items:[
    { heading:'Rate Card', body:'Displays the official VTO & General Services Union SL delivery rate card for Freetown and surrounds, organised by zone and tier (Western, Central, Eastern).' },
    { heading:'Editing Prices', body:'Click Edit on any zone card or row to update the single-trip and double-trip prices. Changes are saved locally for the current session.' },
  ]},
  { icon:'📅', title:'Appointments', color:'yellow', items:[
    { heading:'Scheduling', body:'Book service appointments for customers. Set the date, time, type (Water Delivery or Sewage Collection), and assign a driver/vehicle.' },
    { heading:'Status Tracking', body:'Appointments move through: Scheduled → Confirmed → Completed (or Cancelled). Update status by clicking the appointment.' },
  ]},
  { icon:'⚙️', title:'Settings', color:'gray', items:[
    { heading:'Company Tab', body:'Set your company name, address, phone, email, currency symbol, and TIN number. These appear on all printed invoices and delivery notes.' },
    { heading:'Pricing Tab', body:'Set default unit prices for Water Supply and Sewage Disposal. These auto-fill when creating new deliveries.' },
    { heading:'Banking Tab', body:'Add your bank name, account name, and account number. These print on invoices for customer payments.' },
    { heading:'Security Tab', body:'Change your login password. Minimum 6 characters. All password changes are logged in the Audit Logs.' },
  ]},
];

export default function UserManual() {
  return (
    <Box>
      <HStack mb={6}>
        <Text fontSize="2xl">📖</Text>
        <Box>
          <Heading size="md" color="gray.800">User Manual</Heading>
          <Text fontSize="xs" color="gray.500">Kortahun United Water & Sewage Management System v2.0</Text>
        </Box>
      </HStack>

      <Box bg="blue.50" borderRadius="16px" p={4} mb={6} borderLeft="4px solid" borderLeftColor="blue.500">
        <Text fontSize="sm" color="blue.800" fontWeight="600">Welcome to Kortahun United</Text>
        <Text fontSize="sm" color="blue.700" mt={1}>This system manages water delivery and sewage disposal logistics including customers, deliveries, vehicles, drivers, payments, expenses, billing, and reports — all in one place backed by MongoDB Atlas.</Text>
      </Box>

      <VStack spacing={3} align="stretch">
        {SECTIONS.map((section, si) => (
          <Box key={si} bg="white" borderRadius="16px" shadow="sm" overflow="hidden">
            <Accordion allowToggle>
              <AccordionItem border="none">
                <AccordionButton px={5} py={4} _hover={{ bg:'gray.50' }}>
                  <HStack flex={1} spacing={3}>
                    <Text fontSize="lg">{section.icon}</Text>
                    <Text fontWeight="700" color="gray.800">{section.title}</Text>
                    <Badge colorScheme={section.color} fontSize="xs">{section.items.length} topics</Badge>
                  </HStack>
                  <AccordionIcon color="gray.400"/>
                </AccordionButton>
                <AccordionPanel pb={4} px={5}>
                  <VStack align="stretch" spacing={4}>
                    {section.items.map((item, ii) => (
                      <Box key={ii}>
                        {ii > 0 && <Divider mb={4}/>}
                        <Text fontWeight="700" fontSize="sm" color="gray.700" mb={2}>{item.heading}</Text>
                        <Text fontSize="sm" color="gray.600" whiteSpace="pre-line">{item.body}</Text>
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>
        ))}
      </VStack>

      <Box mt={6} bg="gray.50" borderRadius="16px" p={5} borderLeft="4px solid" borderLeftColor="gray.300">
        <Text fontSize="sm" color="gray.600" fontWeight="600">Technical Information</Text>
        <Text fontSize="xs" color="gray.500" mt={1}>Kortahun United v2.0 — React + Vite + Chakra UI frontend, Netlify Functions (Node.js) backend, MongoDB Atlas database. Developed by Summit Technologies, Lead Developer: Desmond Decker.</Text>
      </Box>
    </Box>
  );
}
