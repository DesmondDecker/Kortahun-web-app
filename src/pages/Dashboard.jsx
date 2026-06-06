import { useState, useEffect, useCallback } from 'react';
import {
  Box, Flex, HStack, VStack, Text, Badge, Grid, GridItem,
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow,
  Card, CardBody, CardHeader, Heading, Divider, Button,
  SimpleGrid, Spinner, Center, Avatar, Progress, useToast,
  Table, Thead, Tbody, Tr, Th, Td,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { dashboard as dashApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

const BILL_COLORS = { Pending:'yellow', Paid:'green', Overdue:'red', Draft:'gray', Cancelled:'gray' };
const CHART_COLS  = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4'];
const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ label, value, sub, color, icon, onClick }) {
  return (
    <Card cursor={onClick?'pointer':'default'} onClick={onClick} _hover={onClick?{ shadow:'md', transform:'translateY(-1px)' }:{}} transition="all 0.15s" borderLeft="4px solid" borderLeftColor={`${color}.400`}>
      <CardBody>
        <Flex justify="space-between" align="flex-start">
          <Stat>
            <StatLabel color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="wide">{label}</StatLabel>
            <StatNumber color={`${color}.600`} fontSize="2xl" fontWeight="800">{value}</StatNumber>
            {sub && <StatHelpText color="gray.400" fontSize="xs" mb={0}>{sub}</StatHelpText>}
          </Stat>
          <Text fontSize="2xl" opacity={0.7}>{icon}</Text>
        </Flex>
      </CardBody>
    </Card>
  );
}

export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const toast    = useToast();
  const navigate = useNavigate();
  const { fmt }  = useSettings();
  const { user } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashApi.stats();
      setData(res.data);
    } catch(e) { toast({ title:'Could not load dashboard', description: e.message, status:'error', duration:4000 }); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Center h="60vh"><VStack><Spinner size="xl" color="blue.500" thickness="3px"/><Text color="gray.500" mt={2}>Loading dashboard…</Text></VStack></Center>;

  const s = data?.stats || {};
  const monthlyData = (data?.charts?.monthlyRevenue || []).map(m => ({ month: MONTHS[(m._id||1)-1], revenue: m.revenue||0, count: m.count||0 }));
  const statusData  = (data?.charts?.statusBreakdown || []).map((s,i) => ({ name: s._id, value: s.count||0, total: s.total||0, color: CHART_COLS[i] }));

  const now   = new Date();
  const greet = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Box>
          <Text fontSize="xs" color="gray.400" fontWeight="600" textTransform="uppercase" letterSpacing="wide">{greet}</Text>
          <Heading size="md" color="gray.800">{user?.username || 'User'} 👋</Heading>
          <Text fontSize="sm" color="gray.500">{now.toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</Text>
        </Box>
        <HStack spacing={2}>
          <Button size="sm" variant="outline" colorScheme="blue" onClick={load}>↻ Refresh</Button>
          <Button size="sm" colorScheme="blue" onClick={()=>navigate('/deliveries')}>+ New Delivery</Button>
        </HStack>
      </Flex>

      {/* Revenue + Outstanding highlight */}
      <Grid templateColumns={{ base:'1fr', md:'1fr 1fr' }} gap={4} mb={6}>
        <Box bg="linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)" borderRadius="20px" p={5} color="white">
          <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wider" opacity={0.8}>Total Revenue</Text>
          <Text fontSize="3xl" fontWeight="900" mt={1}>{fmt(s.totalRevenue||0)}</Text>
          <Text fontSize="xs" opacity={0.7} mt={1}>{s.paidBills||0} paid bills</Text>
          <Progress value={s.paidBills && s.totalBills ? (s.paidBills/s.totalBills)*100 : 0} colorScheme="whiteAlpha" bg="rgba(255,255,255,0.2)" borderRadius="full" size="sm" mt={3}/>
        </Box>
        <Box bg="linear-gradient(135deg, #DC2626 0%, #F87171 100%)" borderRadius="20px" p={5} color="white">
          <Text fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="wider" opacity={0.8}>Outstanding Balance</Text>
          <Text fontSize="3xl" fontWeight="900" mt={1}>{fmt(s.totalOutstanding||0)}</Text>
          <Text fontSize="xs" opacity={0.7} mt={1}>{s.pendingBills||0} unpaid bills</Text>
          <Button size="xs" mt={3} bg="rgba(255,255,255,0.2)" color="white" _hover={{ bg:'rgba(255,255,255,0.3)' }} onClick={()=>navigate('/billing')}>View Bills →</Button>
        </Box>
      </Grid>

      {/* Stat grid */}
      <SimpleGrid columns={{ base:2, md:3, lg:4 }} spacing={4} mb={6}>
        <StatCard label="Customers"      value={s.totalCustomers||0}  sub={`${s.activeCustomers||0} active`}        color="blue"   icon="👥" onClick={()=>navigate('/customers')}/>
        <StatCard label="Deliveries"     value={s.totalDeliveries||0} sub={`${s.recentDeliveries||0} this month`}   color="teal"   icon="🚚" onClick={()=>navigate('/deliveries')}/>
        <StatCard label="Vehicles"       value={s.totalVehicles||0}   sub={`${s.activeVehicles||0} active`}         color="orange" icon="🚛" onClick={()=>navigate('/vehicles')}/>
        <StatCard label="Drivers"        value={s.totalDrivers||0}    sub={`${s.availableDrivers||0} available`}    color="purple" icon="👤" onClick={()=>navigate('/drivers')}/>
        <StatCard label="Total Bills"    value={s.totalBills||0}      sub={`${s.paidBills||0} paid`}                color="green"  icon="💰" onClick={()=>navigate('/billing')}/>
        <StatCard label="Pending Bills"  value={s.pendingBills||0}    sub="needs attention"                         color="yellow" icon="⚠️" onClick={()=>navigate('/billing')}/>
        <StatCard label="Recent Expenses"value={fmt(s.recentExpenses||0)} sub="last 30 days"                        color="red"    icon="📉" onClick={()=>navigate('/expenses')}/>
        <StatCard label="Appointments"   value={data?.upcomingAppointments?.length||0} sub="upcoming"              color="cyan"   icon="📅" onClick={()=>navigate('/appointments')}/>
      </SimpleGrid>

      {/* Charts + Recent */}
      <Grid templateColumns={{ base:'1fr', lg:'3fr 2fr' }} gap={6} mb={6}>
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader pb={0}><Heading size="sm" color="gray.700">📊 Monthly Revenue</Heading></CardHeader>
          <CardBody>
            {monthlyData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{ fontSize:11 }}/>
                  <YAxis tick={{ fontSize:11 }}/>
                  <Tooltip formatter={(v)=>fmt(v)} labelStyle={{ fontWeight:'bold' }}/>
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <Center h="180px" color="gray.400"><Text fontSize="sm">No revenue data yet</Text></Center>}
          </CardBody>
        </Card>

        {/* Bill Status Pie */}
        <Card>
          <CardHeader pb={0}><Heading size="sm" color="gray.700">🥧 Bill Status</Heading></CardHeader>
          <CardBody>
            {statusData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n,p) => [v, p.payload.name]}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <Center h="180px" color="gray.400"><Text fontSize="sm">No bill data yet</Text></Center>}
          </CardBody>
        </Card>
      </Grid>

      {/* Recent Bills + Upcoming Appointments */}
      <Grid templateColumns={{ base:'1fr', lg:'3fr 2fr' }} gap={6}>
        <Card>
          <CardHeader pb={2}>
            <Flex justify="space-between" align="center">
              <Heading size="sm" color="gray.700">🧾 Recent Bills</Heading>
              <Button size="xs" variant="ghost" colorScheme="blue" onClick={()=>navigate('/billing')}>View all →</Button>
            </Flex>
          </CardHeader>
          <Divider/>
          <CardBody p={0}>
            <Table variant="simple" size="sm">
              <Thead><Tr><Th>Customer</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th></Tr></Thead>
              <Tbody>
                {(data?.recentBills||[]).slice(0,7).map(b => (
                  <Tr key={b._id} _hover={{ bg:'gray.50' }} cursor="pointer" onClick={()=>navigate('/billing')}>
                    <Td fontWeight="500" fontSize="sm">{b.customer?.name||'—'}</Td>
                    <Td fontWeight="700" fontSize="sm" color="blue.700">{fmt(b.total||0)}</Td>
                    <Td><Badge colorScheme={BILL_COLORS[b.status]||'gray'} fontSize="xs">{b.status}</Badge></Td>
                    <Td color="gray.400" fontSize="xs">{b.createdAt?.split('T')[0]}</Td>
                  </Tr>
                ))}
                {!data?.recentBills?.length && <Tr><Td colSpan={4} textAlign="center" py={6} color="gray.400">No bills yet</Td></Tr>}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader pb={2}>
            <Flex justify="space-between" align="center">
              <Heading size="sm" color="gray.700">📅 Upcoming Appointments</Heading>
              <Button size="xs" variant="ghost" colorScheme="blue" onClick={()=>navigate('/appointments')}>View all →</Button>
            </Flex>
          </CardHeader>
          <Divider/>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              {(data?.upcomingAppointments||[]).slice(0,5).map(a => (
                <HStack key={a._id} spacing={3} align="flex-start">
                  <Box w={2} h={2} borderRadius="full" bg="blue.400" mt={1.5} flexShrink={0}/>
                  <Box flex={1}>
                    <Text fontSize="sm" fontWeight="600" noOfLines={1}>{a.customerName||'—'}</Text>
                    <Text fontSize="xs" color="gray.500">{a.service} · {new Date(a.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</Text>
                  </Box>
                  <Badge colorScheme="blue" fontSize="9px">{a.status}</Badge>
                </HStack>
              ))}
              {!data?.upcomingAppointments?.length && <Text color="gray.400" fontSize="sm" textAlign="center" py={4}>No upcoming appointments</Text>}
            </VStack>
          </CardBody>
        </Card>
      </Grid>
    </Box>
  );
}
