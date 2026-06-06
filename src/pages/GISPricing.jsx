import { useState } from 'react';
import {
  Box, Flex, HStack, VStack, Text, Badge, Grid, GridItem,
  Table, Thead, Tbody, Tr, Th, Td, Input, Button,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  useToast, Heading, Card, CardBody, Divider, Tooltip,
} from '@chakra-ui/react';
import { EditIcon, CheckIcon, CloseIcon, DownloadIcon } from '@chakra-ui/icons';
import { useSettings } from '../context/SettingsContext';

const DEFAULT_ZONES = [
  { id:1, zone:'WESTERN URBAN (1)',  tier:'Western', color:'blue',   areas:['Congo Town','Murray Town','Wilkinson Road','Aberdeen','Beach Road','Lumley','Malama','Juba','Levema Beach','Signal Hill'], single:2500, double:4000 },
  { id:2, zone:'WESTERN URBAN (2)',  tier:'Western', color:'blue',   areas:['Wilberforce','Hill Station','Imatt','Spur Loop','Spur Road'], single:4000, double:5500 },
  { id:3, zone:'WESTERN RURAL (1)', tier:'Western', color:'cyan',   areas:['Majay Town','Goderich','College','Adonkia','Angola','Metchem','Ogoo Farm','Laka','Hamilton','Mambo','Mile 13'], single:3000, double:5000 },
  { id:4, zone:'WESTERN RURAL (2)', tier:'Western', color:'cyan',   areas:['Banga Farm','Baw Baw','Number 2','Sussex','Tokeh','York Village','Black Johnson','John Obey','Bureh','Kent'], single:5000, double:7500 },
  { id:5, zone:'WESTERN RURAL (3)', tier:'Western', color:'cyan',   areas:['Regent','Gloucester','Leicester','Fourah Bay College','Grafton','Kosso Town','Bathurst','Charlotte','Jui','Hasting'], single:4000, double:5500 },
  { id:6, zone:'WESTERN RURAL (4)', tier:'Western', color:'cyan',   areas:['Rokel','Waterloo','Macdonald','Tombo','Deep Eye Water','Devil Hole','Samuel Town','Sukuma','Kissi Town'], single:4000, double:7500 },
  { id:7, zone:'CENTRAL (1)',       tier:'Central', color:'purple', areas:['Congo Cross','Fourah Bay Road','Eastern Police','Sanni Abacha','Siaka Stevens St','Circular Road','Mountain Court','Hill Cut','Tengbeh Town','Sanders Street','St John','Pademba Road','New England','Brookfields','Up-Gun'], single:2200, double:4000 },
  { id:8, zone:'EASTERN URBAN (1)', tier:'Eastern', color:'orange', areas:['Ferry Junction','Cline Town','PWD','Black Hall Road','Kissy Bypass Road','Wellington','Shell','Low Cost','Rokupa','Texaco','Portee'], single:3000, double:5000 },
  { id:9, zone:'EASTERN URBAN (2)', tier:'Eastern', color:'orange', areas:['Allen Town','Calaba Town','Orugu'], single:3500, double:5500 },
];

const TIER_COLORS = { Western:'blue', Central:'purple', Eastern:'orange' };

function ZoneCard({ zone, onEdit }) {
  return (
    <Card borderTop="3px solid" borderTopColor={`${zone.color}.400`} borderRadius="12px" shadow="sm" _hover={{ shadow:'md', transform:'translateY(-1px)' }} transition="all 0.15s">
      <CardBody p={4}>
        <Flex justify="space-between" align="flex-start" mb={3}>
          <Box>
            <Badge colorScheme={TIER_COLORS[zone.tier]} fontSize="9px" mb={1}>{zone.tier}</Badge>
            <Text fontWeight="800" fontSize="sm" color="gray.800">{zone.zone}</Text>
          </Box>
          <Button size="xs" variant="ghost" colorScheme="blue" leftIcon={<EditIcon/>} onClick={()=>onEdit(zone)}>Edit</Button>
        </Flex>
        <Grid templateColumns="1fr 1fr" gap={2} mb={3}>
          <Box bg="blue.50" borderRadius="8px" p={2} textAlign="center">
            <Text fontSize="9px" color="blue.500" fontWeight="600">SINGLE TRIP (1–6,000 L)</Text>
            <Text fontSize="lg" fontWeight="800" color="blue.700">NLe {zone.single?.toLocaleString()}</Text>
          </Box>
          <Box bg="purple.50" borderRadius="8px" p={2} textAlign="center">
            <Text fontSize="9px" color="purple.500" fontWeight="600">DOUBLE TRIP (6–12,000 L)</Text>
            <Text fontSize="lg" fontWeight="800" color="purple.700">NLe {zone.double?.toLocaleString()}</Text>
          </Box>
        </Grid>
        <Box>
          <Text fontSize="10px" color="gray.500" fontWeight="600" mb={1}>COVERAGE AREAS</Text>
          <Flex wrap="wrap" gap={1}>
            {zone.areas.map(a=><Badge key={a} colorScheme="gray" fontSize="9px">{a}</Badge>)}
          </Flex>
        </Box>
      </CardBody>
    </Card>
  );
}

export default function GISPricing() {
  const [zones,       setZones]       = useState(DEFAULT_ZONES);
  const [editingZone, setEditingZone] = useState(null);
  const [editForm,    setEditForm]    = useState({});
  const [search,      setSearch]      = useState('');
  const [filterTier,  setFilterTier]  = useState('');
  const toast = useToast();
  const { fmt } = useSettings();

  const startEdit = (z) => { setEditingZone(z.id); setEditForm({ single: z.single, double: z.double }); };
  const cancelEdit = () => setEditingZone(null);
  const saveEdit = (id) => {
    setZones(zs => zs.map(z => z.id===id ? { ...z, single: Number(editForm.single), double: Number(editForm.double) } : z));
    setEditingZone(null);
    toast({ title:'Prices updated', status:'success', duration:2000 });
  };

  const filtered = zones.filter(z => {
    const matchSearch = !search || z.zone.toLowerCase().includes(search.toLowerCase()) || z.areas.some(a=>a.toLowerCase().includes(search.toLowerCase()));
    const matchTier   = !filterTier || z.tier === filterTier;
    return matchSearch && matchTier;
  });

  const exportCSV = () => {
    const rows = zones.map(z => `"${z.zone}","${z.tier}","${z.areas.join(', ')}",${z.single},${z.double}`);
    const csv  = ['Zone,Tier,Areas,Single Trip (NLe),Double Trip (NLe)', ...rows].join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='gis-pricing.csv'; a.click();
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Box>
          <Heading size="md" color="gray.800">🗺️ GIS Delivery Pricing</Heading>
          <Text fontSize="xs" color="gray.500" mt={1}>VTO & General Services Union SL — Official Rate Card</Text>
        </Box>
        <HStack>
          <Button size="sm" leftIcon={<DownloadIcon/>} variant="outline" onClick={exportCSV}>Export</Button>
        </HStack>
      </Flex>

      <Tabs variant="enclosed" mb={6}>
        <TabList><Tab>Zone Cards</Tab><Tab>Rate Table</Tab></TabList>
        <TabPanels>
          <TabPanel p={0} pt={4}>
            <Flex gap={3} mb={4} wrap="wrap">
              <Input placeholder="Search zones or areas…" bg="white" size="sm" borderRadius="8px" flex={1} minW="200px" value={search} onChange={e=>setSearch(e.target.value)}/>
              <HStack>
                {['','Western','Central','Eastern'].map(t=>(
                  <Button key={t} size="xs" variant={filterTier===t?'solid':'outline'} colorScheme={t?TIER_COLORS[t]:'gray'} onClick={()=>setFilterTier(t)}>
                    {t||'All'}
                  </Button>
                ))}
              </HStack>
            </Flex>
            <Grid templateColumns={{ base:'1fr', md:'repeat(2,1fr)', lg:'repeat(3,1fr)' }} gap={4}>
              {filtered.map(z=><ZoneCard key={z.id} zone={z} onEdit={startEdit}/>)}
            </Grid>
          </TabPanel>
          <TabPanel>
            <Box bg="white" borderRadius="16px" shadow="sm" overflow="hidden">
              <Table variant="simple" size="sm">
                <Thead><Tr><Th>Zone</Th><Th>Tier</Th><Th>Single Trip (NLe)</Th><Th>Double Trip (NLe)</Th><Th>Actions</Th></Tr></Thead>
                <Tbody>
                  {zones.map(z=>(
                    <Tr key={z.id} _hover={{ bg:'gray.50' }}>
                      <Td fontWeight="600">{z.zone}</Td>
                      <Td><Badge colorScheme={TIER_COLORS[z.tier]}>{z.tier}</Badge></Td>
                      <Td>
                        {editingZone===z.id
                          ? <Input size="xs" type="number" value={editForm.single} onChange={e=>setEditForm(f=>({...f,single:e.target.value}))} w="100px"/>
                          : <Text fontWeight="700" color="blue.700">{z.single?.toLocaleString()}</Text>
                        }
                      </Td>
                      <Td>
                        {editingZone===z.id
                          ? <Input size="xs" type="number" value={editForm.double} onChange={e=>setEditForm(f=>({...f,double:e.target.value}))} w="100px"/>
                          : <Text fontWeight="700" color="purple.700">{z.double?.toLocaleString()}</Text>
                        }
                      </Td>
                      <Td>
                        {editingZone===z.id
                          ? <HStack spacing={1}><Button size="xs" colorScheme="green" leftIcon={<CheckIcon/>} onClick={()=>saveEdit(z.id)}>Save</Button><Button size="xs" variant="ghost" leftIcon={<CloseIcon/>} onClick={cancelEdit}>Cancel</Button></HStack>
                          : <Button size="xs" variant="ghost" colorScheme="blue" leftIcon={<EditIcon/>} onClick={()=>startEdit(z)}>Edit</Button>
                        }
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
