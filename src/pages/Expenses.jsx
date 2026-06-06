import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Flex, HStack, VStack, Text, Button, Badge, Grid,
  Table, Thead, Tbody, Tr, Th, Td, Input, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  FormControl, FormLabel, Textarea, Tabs, TabList, Tab, TabPanels, TabPanel,
  useDisclosure, useToast, Stat, StatLabel, StatNumber, Card, CardBody,
  SimpleGrid, Spinner, Center, Heading, IconButton,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, DeleteIcon, SearchIcon } from '@chakra-ui/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { expenses as api, vehicles as vehApi, drivers as drvApi } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const CATEGORIES = ['Fuel','Maintenance','Repairs','Salaries','Tools & Equipment','Office Supplies','Vehicle Insurance','Permits & Licenses','Other'];
const CAT_COLORS = ['#F59E0B','#3B82F6','#EF4444','#10B981','#8B5CF6','#6B7280','#14B8A6','#EAB308','#94A3B8'];
const EMPTY = { category:'Fuel', description:'', amount:'', vendor:'', vehicle_id:'', driver_id:'', expense_date: new Date().toISOString().split('T')[0], receipt_ref:'', notes:'' };

export default function Expenses() {
  const [items,    setItems]    = useState([]);
  const [stats,    setStats]    = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState(EMPTY);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [filterCat,setFilterCat]= useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDelOpen, onOpen: onDelOpen, onClose: onDelClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();
  const { fmt } = useSettings();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, vRes, dRes, sRes] = await Promise.all([
        api.list({ search, category: filterCat }),
        vehApi.list(), drvApi.list(), api.stats()
      ]);
      setItems(eRes.data || []);
      setVehicles(vRes.data || []);
      setDrivers(dRes.data || []);
      setStats(sRes.data || null);
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
    setLoading(false);
  }, [search, filterCat]);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm({ ...EMPTY, expense_date: new Date().toISOString().split('T')[0] }); onOpen(); };
  const openEdit = (e) => { setEditing(e); setForm({ category:e.category, description:e.description||'', amount:e.amount, vendor:e.vendor||'', vehicle_id:e.vehicle_id||'', driver_id:e.driver_id||'', expense_date:e.expense_date?.split('T')[0]||'', receipt_ref:e.receipt_ref||'', notes:e.notes||'' }); onOpen(); };

  const save = async () => {
    if (!form.amount || !form.description) { toast({ title:'Amount and description required', status:'warning', duration:2000 }); return; }
    setSaving(true);
    try {
      editing ? await api.update(editing._id, form) : await api.create(form);
      toast({ title: editing ? 'Expense updated' : 'Expense added', status:'success', duration:2000 });
      onClose(); load();
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
    setSaving(false);
  };

  const doDelete = async () => {
    try { await api.remove(deleting._id); toast({ title:'Expense deleted', status:'info', duration:2000 }); onDelClose(); load(); }
    catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
  };

  const totalExpenses = items.reduce((s,e)=>s+(e.amount||0),0);
  const byCat = CATEGORIES.map((cat,i) => ({ name:cat, value: items.filter(e=>e.category===cat).reduce((s,e)=>s+(e.amount||0),0), color: CAT_COLORS[i] })).filter(c=>c.value>0);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md" color="gray.800">📉 Expenses</Heading>
        <Button leftIcon={<AddIcon/>} colorScheme="red" size="sm" onClick={openAdd}>Add Expense</Button>
      </Flex>

      <SimpleGrid columns={{ base:2, md:4 }} spacing={4} mb={6}>
        <Card><CardBody><Stat><StatLabel color="gray.500" fontSize="xs">Total Expenses</StatLabel><StatNumber color="red.500" fontSize="lg">{fmt(totalExpenses)}</StatNumber></Stat></CardBody></Card>
        <Card><CardBody><Stat><StatLabel color="gray.500" fontSize="xs">Records</StatLabel><StatNumber color="blue.500">{items.length}</StatNumber></Stat></CardBody></Card>
        {CATEGORIES.slice(0,2).map((cat,i) => {
          const total = items.filter(e=>e.category===cat).reduce((s,e)=>s+(e.amount||0),0);
          return <Card key={cat}><CardBody><Stat><StatLabel color="gray.500" fontSize="xs">{cat}</StatLabel><StatNumber color="orange.500" fontSize="lg">{fmt(total)}</StatNumber></Stat></CardBody></Card>;
        })}
      </SimpleGrid>

      <Tabs variant="enclosed" mb={6}>
        <TabList><Tab>Records</Tab><Tab>Analytics</Tab></TabList>
        <TabPanels>
          <TabPanel p={0} pt={4}>
            <Flex gap={3} mb={4} wrap="wrap">
              <HStack bg="white" borderRadius="8px" border="1px solid" borderColor="gray.200" px={3} flex={1} minW="200px">
                <SearchIcon color="gray.400" fontSize="sm"/>
                <Input variant="unstyled" placeholder="Search expenses..." value={search} onChange={e=>setSearch(e.target.value)} size="sm" py={2}/>
              </HStack>
              <Select bg="white" size="sm" borderRadius="8px" w="180px" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </Select>
            </Flex>
            {loading ? <Center h="40vh"><Spinner size="xl" color="blue.500"/></Center> : (
              <Box bg="white" borderRadius="16px" shadow="sm" overflow="hidden">
                <Table variant="simple" size="sm">
                  <Thead><Tr><Th>Date</Th><Th>Category</Th><Th>Description</Th><Th>Vendor</Th><Th>Amount</Th><Th></Th></Tr></Thead>
                  <Tbody>
                    {items.map(e=>(
                      <Tr key={e._id} _hover={{ bg:'gray.50' }}>
                        <Td color="gray.500" fontSize="xs">{e.expense_date?.split('T')[0]}</Td>
                        <Td><Badge colorScheme={['orange','blue','red','green','purple','gray','teal','yellow','gray'][CATEGORIES.indexOf(e.category)]||'gray'} fontSize="xs">{e.category}</Badge></Td>
                        <Td fontWeight="500">{e.description}</Td>
                        <Td color="gray.500">{e.vendor||'—'}</Td>
                        <Td fontWeight="700" color="red.600">{fmt(e.amount)}</Td>
                        <Td><HStack spacing={1}>
                          <IconButton size="xs" icon={<EditIcon/>} onClick={()=>openEdit(e)} variant="ghost" colorScheme="blue" aria-label="Edit"/>
                          <IconButton size="xs" icon={<DeleteIcon/>} onClick={()=>{setDeleting(e);onDelOpen();}} variant="ghost" colorScheme="red" aria-label="Delete"/>
                        </HStack></Td>
                      </Tr>
                    ))}
                    {!items.length && <Tr><Td colSpan={6} textAlign="center" py={8} color="gray.400">No expenses found</Td></Tr>}
                  </Tbody>
                </Table>
              </Box>
            )}
          </TabPanel>
          <TabPanel>
            <Grid templateColumns={{ base:'1fr', md:'1fr 1fr' }} gap={6}>
              <Box bg="white" borderRadius="16px" p={4} shadow="sm">
                <Text fontWeight="700" mb={4} fontSize="sm" color="gray.700">Expenses by Category</Text>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart><Pie data={byCat} dataKey="value" cx="50%" cy="50%" outerRadius={90} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                    {byCat.map((entry,i)=><Cell key={i} fill={entry.color}/>)}
                  </Pie><Tooltip formatter={v=>fmt(v)}/></PieChart>
                </ResponsiveContainer>
              </Box>
              <Box bg="white" borderRadius="16px" p={4} shadow="sm">
                <Text fontWeight="700" mb={4} fontSize="sm" color="gray.700">Category Breakdown</Text>
                <VStack align="stretch" spacing={2}>
                  {byCat.sort((a,b)=>b.value-a.value).map((c,i)=>(
                    <Flex key={i} justify="space-between" align="center">
                      <HStack><Box w={3} h={3} borderRadius="full" bg={c.color}/><Text fontSize="sm">{c.name}</Text></HStack>
                      <Text fontWeight="700" fontSize="sm" color="red.600">{fmt(c.value)}</Text>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay/>
        <ModalContent borderRadius="16px">
          <ModalHeader>{editing ? 'Edit Expense' : 'Add Expense'}</ModalHeader>
          <ModalCloseButton/>
          <ModalBody>
            <Grid templateColumns="1fr 1fr" gap={4}>
              <FormControl isRequired><FormLabel fontSize="sm">Category</FormLabel><Select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</Select></FormControl>
              <FormControl isRequired><FormLabel fontSize="sm">Amount (NLe)</FormLabel><Input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:Number(e.target.value)}))}/></FormControl>
              <FormControl isRequired gridColumn="1/-1"><FormLabel fontSize="sm">Description</FormLabel><Input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What was this expense for?"/></FormControl>
              <FormControl><FormLabel fontSize="sm">Vendor / Supplier</FormLabel><Input value={form.vendor} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))}/></FormControl>
              <FormControl><FormLabel fontSize="sm">Date</FormLabel><Input type="date" value={form.expense_date} onChange={e=>setForm(f=>({...f,expense_date:e.target.value}))}/></FormControl>
              <FormControl><FormLabel fontSize="sm">Linked Vehicle</FormLabel><Select value={form.vehicle_id} onChange={e=>setForm(f=>({...f,vehicle_id:e.target.value}))}><option value="">— None —</option>{vehicles.map(v=><option key={v._id} value={v._id}>{v.vehicle_number}</option>)}</Select></FormControl>
              <FormControl><FormLabel fontSize="sm">Linked Driver</FormLabel><Select value={form.driver_id} onChange={e=>setForm(f=>({...f,driver_id:e.target.value}))}><option value="">— None —</option>{drivers.map(d=><option key={d._id} value={d._id}>{d.full_name}</option>)}</Select></FormControl>
              <FormControl><FormLabel fontSize="sm">Receipt Ref</FormLabel><Input value={form.receipt_ref} onChange={e=>setForm(f=>({...f,receipt_ref:e.target.value}))}/></FormControl>
              <FormControl gridColumn="1/-1"><FormLabel fontSize="sm">Notes</FormLabel><Textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></FormControl>
            </Grid>
          </ModalBody>
          <ModalFooter gap={3}><Button variant="ghost" onClick={onClose}>Cancel</Button><Button colorScheme="red" onClick={save} isLoading={saving}>{editing?'Update':'Add'}</Button></ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={isDelOpen} leastDestructiveRef={cancelRef} onClose={onDelClose}>
        <AlertDialogOverlay><AlertDialogContent borderRadius="16px">
          <AlertDialogHeader>Delete Expense</AlertDialogHeader>
          <AlertDialogBody>Delete this expense of <b>{fmt(deleting?.amount)}</b>? This cannot be undone.</AlertDialogBody>
          <AlertDialogFooter gap={3}><Button ref={cancelRef} onClick={onDelClose}>Cancel</Button><Button colorScheme="red" onClick={doDelete}>Delete</Button></AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
