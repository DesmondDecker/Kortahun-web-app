import { useState, useEffect, useCallback } from 'react';
import {
  Box, Flex, HStack, VStack, Text, Button, Grid,
  Table, Thead, Tbody, Tr, Th, Td, Input,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  useToast, Stat, StatLabel, StatNumber, Card, CardBody,
  SimpleGrid, Spinner, Center, Heading, Badge,
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { reports as reportsApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS  = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6'];

export default function Reports() {
  const [summary,  setSummary]  = useState(null);
  const [revenue,  setRevenue]  = useState([]);
  const [delData,  setDelData]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth()-6); return d.toISOString().split('T')[0]; });
  const [dateTo,   setDateTo]   = useState(() => new Date().toISOString().split('T')[0]);
  const toast = useToast();
  const { fmt } = useSettings();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, rRes, dRes] = await Promise.all([
        reportsApi.summary({ date_from: dateFrom, date_to: dateTo }),
        reportsApi.revenue({ date_from: dateFrom, date_to: dateTo }),
        reportsApi.deliveries({ date_from: dateFrom, date_to: dateTo }),
      ]);
      setSummary(sRes.data);
      setRevenue(rRes.data || []);
      setDelData(dRes.data || []);
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
    setLoading(false);
  }, [dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);

  const exportCSV = (data, filename) => {
    if (!data.length) { toast({ title:'No data to export', status:'warning', duration:2000 }); return; }
    const keys = Object.keys(data[0]);
    const csv  = [keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = filename; a.click();
  };

  if (loading) return <Center h="60vh"><Spinner size="xl" color="blue.500"/></Center>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="md" color="gray.800">📈 Reports</Heading>
        <HStack>
          <Input type="date" size="sm" bg="white" borderRadius="8px" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} w="140px"/>
          <Text fontSize="sm" color="gray.500">to</Text>
          <Input type="date" size="sm" bg="white" borderRadius="8px" value={dateTo}   onChange={e=>setDateTo(e.target.value)} w="140px"/>
          <Button size="sm" onClick={load} colorScheme="blue">Refresh</Button>
        </HStack>
      </Flex>

      {summary && (
        <SimpleGrid columns={{ base:2, md:4 }} spacing={4} mb={6}>
          {[
            ['Total Revenue',    fmt(summary.totalRevenue),  'green'],
            ['Total Deliveries', summary.totalDeliveries,    'blue'],
            ['Outstanding',      fmt(summary.outstanding),   'red'],
            ['Active Customers', summary.activeCustomers,    'purple'],
          ].map(([l,v,c])=>(
            <Card key={l}><CardBody><Stat><StatLabel color="gray.500" fontSize="xs">{l}</StatLabel><StatNumber color={`${c}.500`} fontSize="lg">{v}</StatNumber></Stat></CardBody></Card>
          ))}
        </SimpleGrid>
      )}

      <Tabs variant="enclosed">
        <TabList>
          <Tab>Revenue</Tab>
          <Tab>Deliveries</Tab>
          <Tab>Service Mix</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Flex justify="flex-end" mb={3}>
              <Button size="xs" leftIcon={<DownloadIcon/>} variant="ghost" onClick={()=>exportCSV(revenue,'revenue-report.csv')}>Export CSV</Button>
            </Flex>
            <Box bg="white" borderRadius="16px" p={4} shadow="sm" mb={4}>
              <Text fontWeight="700" mb={4} fontSize="sm" color="gray.700">Monthly Revenue</Text>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{ fontSize:12 }}/>
                  <YAxis tick={{ fontSize:12 }}/>
                  <Tooltip formatter={v=>fmt(v)}/>
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </TabPanel>
          <TabPanel>
            <Box bg="white" borderRadius="16px" p={4} shadow="sm" mb={4}>
              <Text fontWeight="700" mb={4} fontSize="sm" color="gray.700">Deliveries Over Time</Text>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={delData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="date" tick={{ fontSize:11 }}/>
                  <YAxis tick={{ fontSize:12 }}/>
                  <Tooltip/>
                  <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </TabPanel>
          <TabPanel>
            {summary?.serviceMix && (
              <Box bg="white" borderRadius="16px" p={4} shadow="sm">
                <Text fontWeight="700" mb={4} fontSize="sm" color="gray.700">Water vs Sewage Deliveries</Text>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={summary.serviceMix} dataKey="count" nameKey="service" cx="50%" cy="50%" outerRadius={100} label={({service,percent})=>`${service} ${(percent*100).toFixed(0)}%`}>
                      {summary.serviceMix.map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
