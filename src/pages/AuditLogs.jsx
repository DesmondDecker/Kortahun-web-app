import { useState, useEffect } from 'react';
import { 
  Box, Heading, Text, Card, CardBody, Table, Thead, Tbody, 
  Tr, Th, Td, Badge, Spinner, Center, Alert, AlertIcon 
} from '@chakra-ui/react';
import { auditLogs } from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await auditLogs.list();
        setLogs(res.data);
      } catch (err) {
        console.error('Audit fetch error:', err);
        setError(err.message || 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <Box p={{ base: 4, md: 6 }}>
      <Box mb={6}>
        <Heading size="lg">Audit Logs</Heading>
        <Text color="gray.500" fontSize="sm">Track system activity and user actions</Text>
      </Box>

      <Card shadow="md" borderRadius="xl">
        <CardBody p={0}>
          {loading ? (
            <Center py={10}><Spinner color="brand.500" /></Center>
          ) : error ? (
            <Alert status="error" m={4} borderRadius="lg"><AlertIcon />{error}</Alert>
          ) : logs.length === 0 ? (
            <Center py={10}><Text color="gray.400">No activity logs found yet.</Text></Center>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>User</Th>
                    <Th>Action</Th>
                    <Th>Resource</Th>
                    <Th>Details</Th>
                    <Th>Timestamp</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {logs.map((log) => (
                    <Tr key={log._id}>
                      <Td fontWeight="bold">{log.user}</Td>
                      <Td>
                        <Badge colorScheme={log.action === 'DELETE' ? 'red' : 'blue'}>
                          {log.action}
                        </Badge>
                      </Td>
                      <Td fontSize="xs" color="gray.600">{log.resource}</Td>
                      <Td fontSize="xs" fontFamily="mono">{JSON.stringify(log.details || {})}</Td>
                      <Td fontSize="xs">{new Date(log.timestamp).toLocaleString()}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}