import { useState, useEffect } from 'react';
import {
  Box, Flex, HStack, VStack, Text, Button, Grid, GridItem,
  FormControl, FormLabel, Input, Select, Textarea,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  useToast, Heading, Divider, Alert, AlertIcon, Badge,
  Table, Thead, Tbody, Tr, Th, Td, IconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  useDisclosure, Spinner, Center,
} from '@chakra-ui/react';
import { EditIcon, AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { auth as authApi } from '../services/api';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [pwForm,  setPwForm]  = useState({ oldPassword:'', newPassword:'', confirm:'' });
  const [pwSaving,setPwSaving]= useState(false);
  const toast = useToast();

  useEffect(() => {
    setForm({
      company_name:      settings.company_name    || '',
      company_address:   settings.company_address || '',
      company_phone:     settings.company_phone   || '',
      company_email:     settings.company_email   || '',
      currency:          settings.currency        || 'NLe',
      water_unit_price:  settings.water_unit_price  || '',
      sewage_unit_price: settings.sewage_unit_price || '',
      bank_name:         settings.bank_name         || '',
      bank_account:      settings.bank_account      || '',
      bank_bban:         settings.bank_bban          || '',
      tin_number:        settings.tin_number         || '',
    });
  }, [settings]);

  const hc = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const saveCompany = async () => {
    setSaving(true);
    try {
      await updateSettings(form);
      toast({ title:'Settings saved', status:'success', duration:2500 });
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
    setSaving(false);
  };

  const changePw = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword) { toast({ title:'Fill in all password fields', status:'warning', duration:2000 }); return; }
    if (pwForm.newPassword !== pwForm.confirm) { toast({ title:'Passwords do not match', status:'warning', duration:2000 }); return; }
    if (pwForm.newPassword.length < 6) { toast({ title:'New password must be at least 6 characters', status:'warning', duration:2000 }); return; }
    setPwSaving(true);
    try {
      await authApi.changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast({ title:'Password updated successfully', status:'success', duration:3000 });
      setPwForm({ oldPassword:'', newPassword:'', confirm:'' });
    } catch(e) { toast({ title:e.message, status:'error', duration:3000 }); }
    setPwSaving(false);
  };

  return (
    <Box>
      <Heading size="md" color="gray.800" mb={6}>⚙️ Settings</Heading>
      <Tabs variant="enclosed">
        <TabList>
          <Tab>Company</Tab>
          <Tab>Pricing</Tab>
          <Tab>Banking</Tab>
          <Tab>Security</Tab>
        </TabList>
        <TabPanels>

          {/* Company Tab */}
          <TabPanel>
            <Box bg="white" borderRadius="16px" p={6} shadow="sm" maxW="700px">
              <Text fontWeight="700" mb={4} color="gray.700">Company Information</Text>
              <Grid templateColumns="1fr 1fr" gap={4}>
                <FormControl gridColumn="1/-1"><FormLabel fontSize="sm">Company Name</FormLabel><Input value={form.company_name||''} onChange={e=>hc('company_name',e.target.value)}/></FormControl>
                <FormControl gridColumn="1/-1"><FormLabel fontSize="sm">Address</FormLabel><Textarea rows={2} value={form.company_address||''} onChange={e=>hc('company_address',e.target.value)}/></FormControl>
                <FormControl><FormLabel fontSize="sm">Phone</FormLabel><Input value={form.company_phone||''} onChange={e=>hc('company_phone',e.target.value)} placeholder="+232 76 000 000"/></FormControl>
                <FormControl><FormLabel fontSize="sm">Email</FormLabel><Input type="email" value={form.company_email||''} onChange={e=>hc('company_email',e.target.value)}/></FormControl>
                <FormControl><FormLabel fontSize="sm">Currency Symbol</FormLabel>
                  <Select value={form.currency||'NLe'} onChange={e=>hc('currency',e.target.value)}>
                    {['NLe','SLE','USD','GBP','EUR'].map(c=><option key={c}>{c}</option>)}
                  </Select>
                </FormControl>
                <FormControl><FormLabel fontSize="sm">TIN Number</FormLabel><Input value={form.tin_number||''} onChange={e=>hc('tin_number',e.target.value)}/></FormControl>
              </Grid>
              <Flex justify="flex-end" mt={4}>
                <Button colorScheme="blue" onClick={saveCompany} isLoading={saving}>Save Changes</Button>
              </Flex>
            </Box>
          </TabPanel>

          {/* Pricing Tab */}
          <TabPanel>
            <Box bg="white" borderRadius="16px" p={6} shadow="sm" maxW="500px">
              <Text fontWeight="700" mb={4} color="gray.700">Default Service Prices</Text>
              <Alert status="info" borderRadius="8px" mb={4} fontSize="sm">
                <AlertIcon/>
                These prices auto-fill when creating new deliveries.
              </Alert>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm">Water Supply — Unit Price (NLe per trip)</FormLabel>
                  <Input type="number" value={form.water_unit_price||''} onChange={e=>hc('water_unit_price',e.target.value)}/>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Sewage Disposal — Unit Price (NLe per trip)</FormLabel>
                  <Input type="number" value={form.sewage_unit_price||''} onChange={e=>hc('sewage_unit_price',e.target.value)}/>
                </FormControl>
              </VStack>
              <Flex justify="flex-end" mt={4}>
                <Button colorScheme="blue" onClick={saveCompany} isLoading={saving}>Save Prices</Button>
              </Flex>
            </Box>
          </TabPanel>

          {/* Banking Tab */}
          <TabPanel>
            <Box bg="white" borderRadius="16px" p={6} shadow="sm" maxW="600px">
              <Text fontWeight="700" mb={4} color="gray.700">Bank Details <Badge colorScheme="blue" ml={2} fontSize="xs">Printed on invoices</Badge></Text>
              <Grid templateColumns="1fr 1fr" gap={4}>
                <FormControl gridColumn="1/-1"><FormLabel fontSize="sm">Bank Name</FormLabel><Input value={form.bank_name||''} onChange={e=>hc('bank_name',e.target.value)}/></FormControl>
                <FormControl><FormLabel fontSize="sm">Account Name</FormLabel><Input value={form.bank_account||''} onChange={e=>hc('bank_account',e.target.value)}/></FormControl>
                <FormControl><FormLabel fontSize="sm">Account Number (BBAN)</FormLabel><Input value={form.bank_bban||''} onChange={e=>hc('bank_bban',e.target.value)}/></FormControl>
              </Grid>
              <Flex justify="flex-end" mt={4}>
                <Button colorScheme="blue" onClick={saveCompany} isLoading={saving}>Save Banking Details</Button>
              </Flex>
            </Box>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel>
            <Box bg="white" borderRadius="16px" p={6} shadow="sm" maxW="500px">
              <Text fontWeight="700" mb={4} color="gray.700">Change Password</Text>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Current Password</FormLabel>
                  <Input type="password" value={pwForm.oldPassword} onChange={e=>setPwForm(f=>({...f,oldPassword:e.target.value}))}/>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">New Password</FormLabel>
                  <Input type="password" value={pwForm.newPassword} onChange={e=>setPwForm(f=>({...f,newPassword:e.target.value}))}/>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Confirm New Password</FormLabel>
                  <Input type="password" value={pwForm.confirm} onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))}/>
                </FormControl>
                <Button colorScheme="blue" w="full" onClick={changePw} isLoading={pwSaving}>Update Password</Button>
              </VStack>
            </Box>
          </TabPanel>

        </TabPanels>
      </Tabs>
    </Box>
  );
}
