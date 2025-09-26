// Utility functions for getting client information

/**
 * Get client IP address using a public IP service
 * This is a fallback method since we can't get real IP from client-side JavaScript
 */
export const getClientIP = async (): Promise<string> => {
  try {
    // Try multiple IP services for better reliability
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://api.ip.sb/geoip'
    ];

    for (const service of ipServices) {
      try {
        const response = await fetch(service, { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Different services return IP in different fields
          const ip = data.ip || data.query || data.ipAddress;
          if (ip && typeof ip === 'string') {
            return ip;
          }
        }
      } catch (error) {
        console.warn(`Failed to get IP from ${service}:`, error);
        continue;
      }
    }
    
    return 'unknown';
  } catch (error) {
    console.error('Error getting client IP:', error);
    return 'unknown';
  }
};

/**
 * Get client information for audit logging
 */
export const getClientInfo = async (): Promise<{
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}> => {
  const ipAddress = await getClientIP();
  
  return {
    ipAddress,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };
};
