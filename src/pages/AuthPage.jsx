// src/pages/AuthPage.jsx
import { useState } from 'react';
import {
  Box, VStack, HStack, Text, Input, Button, FormControl, FormLabel,
  FormErrorMessage, Select, Alert, AlertIcon, Tabs, TabList, Tab,
  TabPanels, TabPanel, InputGroup, InputRightElement, IconButton,
  useToast, Flex, Badge,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/api';

function LoginForm({ onSuccess }) {
  const { login } = useAuth();
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const toast = useToast();

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username is required';
    if (!form.password)        e.password = 'Password is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form);
      toast({ title: 'Welcome back!', status: 'success', duration: 2000 });
    } catch (e) {
      toast({ title: 'Login failed', description: e.message, status: 'error', duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <FormControl isInvalid={!!errors.username}>
        <FormLabel fontSize="sm">Username or Email</FormLabel>
        <Input
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          placeholder="Enter username or email"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <FormErrorMessage>{errors.username}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={!!errors.password}>
        <FormLabel fontSize="sm">Password</FormLabel>
        <InputGroup>
          <Input
            type={showPw ? 'text' : 'password'}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Enter password"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <InputRightElement>
            <IconButton
              size="sm" variant="ghost"
              icon={showPw ? <ViewOffIcon /> : <ViewIcon />}
              onClick={() => setShowPw(p => !p)}
              aria-label="Toggle password"
            />
          </InputRightElement>
        </InputGroup>
        <FormErrorMessage>{errors.password}</FormErrorMessage>
      </FormControl>

      <Button
        colorScheme="brand" size="lg" onClick={handleSubmit}
        isLoading={loading} loadingText="Logging in..."
      >
        Login
      </Button>
    </VStack>
  );
}

function RegisterForm() {
  const { login } = useAuth();
  const [form,    setForm]    = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'operator' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const toast = useToast();

  const validate = () => {
    const e = {};
    if (!form.username.trim() || form.username.length < 3) e.username = 'Username must be at least 3 characters';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email is required';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await auth.register({ username: form.username, email: form.email, password: form.password, role: form.role });
      localStorage.setItem('ku_token', res.token);
      login({ username: form.username, password: form.password });
      toast({ title: 'Account created!', status: 'success', duration: 2000 });
    } catch (e) {
      toast({ title: 'Registration failed', description: e.message, status: 'error', duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm(p => ({ ...p, [field]: e.target.value }) )});

  return (
    <VStack spacing={4} align="stretch">
      <FormControl isInvalid={!!errors.username}>
        <FormLabel fontSize="sm">Username</FormLabel>
        <Input {...f('username')} placeholder="Choose a username" />
        <FormErrorMessage>{errors.username}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={!!errors.email}>
        <FormLabel fontSize="sm">Email</FormLabel>
        <Input {...f('email')} type="email" placeholder="you@example.com" />
        <FormErrorMessage>{errors.email}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={!!errors.password}>
        <FormLabel fontSize="sm">Password</FormLabel>
        <InputGroup>
          <Input type={showPw ? 'text' : 'password'} {...f('password')} placeholder="Min. 6 characters" />
          <InputRightElement>
            <IconButton size="sm" variant="ghost" icon={showPw ? <ViewOffIcon /> : <ViewIcon />}
              onClick={() => setShowPw(p => !p)} aria-label="Toggle" />
          </InputRightElement>
        </InputGroup>
        <FormErrorMessage>{errors.password}</FormErrorMessage>
      </FormControl>

      <FormControl isInvalid={!!errors.confirmPassword}>
        <FormLabel fontSize="sm">Confirm Password</FormLabel>
        <Input type="password" {...f('confirmPassword')} placeholder="Repeat password" />
        <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
      </FormControl>

      <FormControl>
        <FormLabel fontSize="sm">Role</FormLabel>
        <Select {...f('role')}>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="operator">Operator</option>
          <option value="viewer">Viewer</option>
        </Select>
      </FormControl>

      <Button colorScheme="brand" size="lg" onClick={handleSubmit}
        isLoading={loading} loadingText="Creating account...">
        Create Account
      </Button>
    </VStack>
  );
}

export default function AuthPage() {
  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50" p={4}>
      <Box w="full" maxW="420px">
        {/* Header */}
        <VStack mb={8} spacing={2}>
          <Text fontSize="4xl">💧</Text>
          <Text fontSize="2xl" fontWeight="bold" color="brand.600">Kortahun United</Text>
          <Text fontSize="sm" color="gray.500">Water & Sewage Management System</Text>
          <Badge colorScheme="orange" variant="subtle">Sierra Leone</Badge>
        </VStack>

        {/* Card */}
        <Box bg="white" rounded="2xl" shadow="xl" p={8}>
          <Tabs colorScheme="brand" isFitted>
            <TabList mb={6}>
              <Tab fontWeight="semibold">Login</Tab>
              <Tab fontWeight="semibold">Register</Tab>
            </TabList>
            <TabPanels>
              <TabPanel p={0}><LoginForm /></TabPanel>
              <TabPanel p={0}><RegisterForm /></TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        <Text textAlign="center" mt={6} fontSize="xs" color="gray.400">
          © 2025 Kortahun United — Freetown, Sierra Leone
        </Text>
      </Box>
    </Flex>
  );
}
