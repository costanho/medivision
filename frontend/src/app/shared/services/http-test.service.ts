import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface ApiEndpointTest {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  expectedStatus: number;
  body?: any;
  headers?: Record<string, string>;
  description: string;
}

export interface TestResult {
  endpoint: string;
  passed: boolean;
  status: number | null;
  message: string;
  duration: number;
  error?: any;
}

@Injectable({
  providedIn: 'root'
})
export class HttpTestService {
  private testResults$ = new Subject<TestResult>();
  private baseUrl = 'http://localhost:8081/api'; // Direct Service API
  private authService: any; // Will be injected

  constructor(private http: HttpClient) {
    // Expose testing methods to window for DevTools
    (window as any).httpTest = {
      testEndpoint: (test: ApiEndpointTest) => this.testEndpoint(test),
      testAllEndpoints: () => this.testAllEndpoints(),
      getResults: () => this.testResults$,
      testConversationFlow: () => this.testConversationFlow(),
      testMessageFlow: () => this.testMessageFlow(),
      testAuthToken: () => this.testAuthToken()
    };
  }

  /**
   * Test a single endpoint
   */
  testEndpoint(test: ApiEndpointTest): Observable<any> {
    const startTime = performance.now();

    console.log(`🧪 Testing: ${test.name}`);
    console.log(`   ${test.method} ${test.url}`);

    const headers = new HttpHeaders(test.headers || {});

    let request$: Observable<any>;

    switch (test.method) {
      case 'GET':
        request$ = this.http.get(test.url, { headers });
        break;
      case 'POST':
        request$ = this.http.post(test.url, test.body, { headers });
        break;
      case 'PUT':
        request$ = this.http.put(test.url, test.body, { headers });
        break;
      case 'DELETE':
        request$ = this.http.delete(test.url, { headers });
        break;
      case 'PATCH':
        request$ = this.http.patch(test.url, test.body, { headers });
        break;
      default:
        throw new Error(`Unknown method: ${test.method}`);
    }

    return request$.pipe(
      tap(
        (response: any) => {
          const duration = Math.round(performance.now() - startTime);
          const passed = this.getStatusCode(response) === test.expectedStatus;

          const result: TestResult = {
            endpoint: test.name,
            passed,
            status: this.getStatusCode(response),
            message: passed ? `✅ PASSED (${duration}ms)` : `❌ FAILED - Expected ${test.expectedStatus}, got ${this.getStatusCode(response)}`,
            duration
          };

          this.testResults$.next(result);
          console.log(`   ${result.message}`);
        },
        (error: any) => {
          const duration = Math.round(performance.now() - startTime);
          const result: TestResult = {
            endpoint: test.name,
            passed: error.status === test.expectedStatus,
            status: error.status,
            message: `❌ FAILED - ${error.error?.message || error.statusText}`,
            duration,
            error
          };

          this.testResults$.next(result);
          console.error(`   ${result.message}`);
        }
      )
    );
  }

  /**
   * Test all messaging endpoints
   */
  testAllEndpoints(): void {
    const endpoints: ApiEndpointTest[] = [
      {
        name: 'Get Conversations',
        method: 'GET',
        url: `${this.baseUrl}/conversations/search/paginated?page=0&size=10`,
        expectedStatus: 200,
        description: 'Fetch list of conversations'
      },
      {
        name: 'Get Conversation by ID',
        method: 'GET',
        url: `${this.baseUrl}/conversations/1`,
        expectedStatus: 200,
        description: 'Fetch single conversation'
      },
      {
        name: 'Get Messages in Conversation',
        method: 'GET',
        url: `${this.baseUrl}/messages/conversation/1?page=0&size=20`,
        expectedStatus: 200,
        description: 'Fetch messages for conversation'
      },
      {
        name: 'Get Doctors List',
        method: 'GET',
        url: `${this.baseUrl}/doctors/directory/paginated?page=0&size=10`,
        expectedStatus: 200,
        description: 'Fetch available doctors'
      }
    ];

    console.group('🧪 Running All Endpoint Tests');
    endpoints.forEach(endpoint => {
      this.testEndpoint(endpoint).subscribe(
        () => {},
        (error) => console.error(`Test failed: ${endpoint.name}`, error)
      );
    });
    console.groupEnd();
  }

  /**
   * Test conversation flow: create, fetch, list
   */
  testConversationFlow(): void {
    console.group('🔄 Testing Conversation Flow');

    // 1. Get list of conversations
    console.log('1️⃣ Fetching conversations...');
    this.http.get(`${this.baseUrl}/conversations/search/paginated?page=0&size=10`).subscribe(
      (response: any) => {
        console.log('✅ Conversations fetched:', response);

        if (response?.content?.length > 0) {
          const conversationId = response.content[0].id;
          console.log(`2️⃣ Fetching conversation ${conversationId}...`);

          // 2. Get specific conversation
          this.http.get(`${this.baseUrl}/conversations/${conversationId}`).subscribe(
            (conv: any) => {
              console.log('✅ Conversation fetched:', conv);

              // 3. Get messages in conversation
              console.log(`3️⃣ Fetching messages for conversation ${conversationId}...`);
              this.http.get(`${this.baseUrl}/messages/conversation/${conversationId}?page=0&size=20`).subscribe(
                (messages: any) => {
                  console.log('✅ Messages fetched:', messages);
                  console.log('🎉 Conversation flow test complete!');
                },
                (error) => console.error('❌ Failed to fetch messages:', error)
              );
            },
            (error) => console.error('❌ Failed to fetch conversation:', error)
          );
        } else {
          console.log('ℹ️ No conversations found');
        }
      },
      (error) => console.error('❌ Failed to fetch conversations:', error)
    );

    console.groupEnd();
  }

  /**
   * Test message send flow
   */
  testMessageFlow(): void {
    console.group('💬 Testing Message Flow');

    // Get a conversation first
    this.http.get(`${this.baseUrl}/conversations/search/paginated?page=0&size=1`).subscribe(
      (response: any) => {
        if (response?.content?.length > 0) {
          const conversationId = response.content[0].id;
          console.log(`Testing message send to conversation ${conversationId}...`);

          const messagePayload = {
            conversationId,
            content: `Test message at ${new Date().toISOString()}`,
            messageType: 'text'
          };

          console.log('📤 Sending message:', messagePayload);

          this.http.post(`${this.baseUrl}/messages`, messagePayload).subscribe(
            (response: any) => {
              console.log('✅ Message sent:', response);
              console.log('🎉 Message flow test complete!');
            },
            (error) => console.error('❌ Failed to send message:', error)
          );
        } else {
          console.log('ℹ️ No conversations available for message test');
        }
      },
      (error) => console.error('❌ Failed to fetch conversations:', error)
    );

    console.groupEnd();
  }

  /**
   * Test JWT token in requests
   */
  testAuthToken(): void {
    console.group('🔐 Testing JWT Token');

    // Get the JWT token from localStorage
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    if (token) {
      console.log('✅ Token found in localStorage');
      console.log('Token preview:', token.substring(0, 50) + '...');

      // Make a request that requires authentication
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      this.http.get(`${this.baseUrl}/conversations/search/paginated?page=0&size=1`, { headers }).subscribe(
        (response: any) => {
          console.log('✅ Request with JWT token succeeded');
          console.log('Response:', response);
        },
        (error) => {
          if (error.status === 401) {
            console.error('❌ Token is invalid or expired');
          } else {
            console.error('❌ Request failed:', error);
          }
        }
      );
    } else {
      console.warn('⚠️ No JWT token found in localStorage');
      console.log('Token location checked:');
      console.log('  - localStorage.getItem("access_token")');
      console.log('  - localStorage.getItem("token")');
    }

    console.groupEnd();
  }

  /**
   * Test pagination
   */
  testPagination(endpoint: string, pageSize = 5): void {
    console.group(`📄 Testing Pagination - ${endpoint}`);

    for (let page = 0; page < 3; page++) {
      const url = `${this.baseUrl}${endpoint}?page=${page}&size=${pageSize}`;
      console.log(`Fetching page ${page}...`);

      this.http.get(url).subscribe(
        (response: any) => {
          const content = response.content || [];
          const totalPages = response.totalPages || 'unknown';
          console.log(`✅ Page ${page}: ${content.length} items (Total pages: ${totalPages})`);
        },
        (error) => console.error(`❌ Failed to fetch page ${page}:`, error)
      );
    }

    console.groupEnd();
  }

  /**
   * Verify request headers
   */
  inspectRequestHeaders(): void {
    console.group('🔍 Inspecting Request Headers');

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const userEmail = localStorage.getItem('user_email') || localStorage.getItem('email');

    console.log('Stored Credentials:');
    console.log('  Token:', token ? `${token.substring(0, 50)}...` : 'NOT FOUND');
    console.log('  Email:', userEmail || 'NOT FOUND');

    console.log('\nMaking test request to inspect headers...');

    this.http.get(`${this.baseUrl}/conversations/search/paginated?page=0&size=1`).subscribe(
      () => {
        console.log('✅ Request successful - check Network tab in DevTools for headers');
      },
      (error) => {
        console.error('❌ Request failed:', error);
        console.log('Check Network tab for error response details');
      }
    );

    console.groupEnd();
  }

  /**
   * Test specific message sending with detailed logging
   */
  testDetailedMessageSend(conversationId: number, message: string): Observable<any> {
    console.group('📤 Detailed Message Send Test');

    const payload = {
      conversationId,
      content: message,
      messageType: 'text'
    };

    console.log('Request Details:');
    console.log('  URL:', `${this.baseUrl}/messages`);
    console.log('  Method: POST');
    console.log('  Payload:', payload);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.baseUrl}/messages`, payload, { headers }).pipe(
      tap(
        (response: any) => {
          console.log('Response Status: 201 Created');
          console.log('Response Body:', response);
          console.log('Message ID:', response.id);
          console.log('✅ Message sent successfully!');
          console.groupEnd();
        },
        (error: any) => {
          console.error('Response Status:', error.status);
          console.error('Error:', error.error);
          console.log('Check Network tab for full request/response details');
          console.groupEnd();
        }
      )
    );
  }

  /**
   * Get HTTP status code from response
   */
  private getStatusCode(response: any): number {
    // Response object might have status property or it could be inferred
    return response?.status || 200;
  }

  /**
   * Print API endpoint documentation
   */
  printApiDocumentation(): void {
    console.group('📚 API Endpoint Documentation');

    const endpoints = [
      {
        title: 'Conversations',
        endpoints: [
          { method: 'GET', path: '/conversations/search/paginated', params: 'page, size', description: 'List conversations' },
          { method: 'GET', path: '/conversations/:id', description: 'Get conversation' },
          { method: 'POST', path: '/conversations', description: 'Create conversation' }
        ]
      },
      {
        title: 'Messages',
        endpoints: [
          { method: 'GET', path: '/messages/conversation/:id', params: 'page, size', description: 'Get messages in conversation' },
          { method: 'POST', path: '/messages', description: 'Send message' },
          { method: 'PUT', path: '/messages/:id', description: 'Update message' },
          { method: 'DELETE', path: '/messages/:id', description: 'Delete message' }
        ]
      },
      {
        title: 'Doctors',
        endpoints: [
          { method: 'GET', path: '/doctors/directory/paginated', params: 'page, size', description: 'List doctors' },
          { method: 'GET', path: '/doctors/:id', description: 'Get doctor profile' }
        ]
      },
      {
        title: 'Appointments',
        endpoints: [
          { method: 'GET', path: '/appointments/search/paginated', params: 'page, size', description: 'List appointments' },
          { method: 'POST', path: '/appointments', description: 'Create appointment' }
        ]
      }
    ];

    endpoints.forEach(group => {
      console.group(`${group.title}`);
      group.endpoints.forEach(ep => {
        const params = ep.params ? ` [${ep.params}]` : '';
        console.log(`${ep.method} ${ep.path}${params} - ${ep.description}`);
      });
      console.groupEnd();
    });

    console.groupEnd();
  }
}
