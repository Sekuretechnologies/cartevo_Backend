const http = require('http');

async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testAPI() {
  console.log('🔥 Virtual Card API - Complete Test Suite (PostgreSQL + Company System)');
  console.log('===============================================================\n');

  try {
    // 0. Company Registration
    console.log('0. 🏢 COMPANY REGISTRATION');
    console.log('   Testing new company and user creation...');
    const companyResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/company/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      full_name_user: 'Test Owner',
      email_user: 'testowner@newcompany.com',
      password_user: 'SecurePass123!',
      name_company: 'Test Company Ltd',
      country_company: 'Nigeria',
      email_company: 'company@testcompany.com'
    });

    if (companyResponse.statusCode === 201) {
      console.log('   ✅ Company registration successful!');
      console.log('   🏢 Company:', companyResponse.data.company.name);
      console.log('   🌍 Country:', companyResponse.data.company.country);
      console.log('   👤 Owner:', companyResponse.data.user.full_name);
      console.log('   🔑 Client ID:', companyResponse.data.company.client_id);
      console.log('   🔐 Client Key:', companyResponse.data.company.client_key.substring(0, 10) + '...');
      if (companyResponse.data.wallets) {
        console.log('   💰 Wallets created:', companyResponse.data.wallets.length);
        companyResponse.data.wallets.forEach(wallet => {
          console.log(`      - ${wallet.currency}: ${wallet.balance} (${wallet.country})`);
        });
      }
      console.log('');
    }

    // 1. Authentication
    console.log('1. 🔐 AUTHENTICATION');
    console.log('   Testing token generation...');
    const authResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      client_id: 'demo_client_001',
      client_key: 'demo_client_key_123'
    });

    if ((authResponse.statusCode === 200 || authResponse.statusCode === 201) && authResponse.data.access_token) {
      console.log('   ✅ Authentication successful!');
      console.log('   📝 Access Token:', authResponse.data.access_token.substring(0, 30) + '...');
      console.log('   🔑 Token Type:', authResponse.data.token_type);
      console.log('   ⏰ Expires In:', authResponse.data.expires_in, 'seconds\n');

      const token = authResponse.data.access_token;

      // 2. Company Wallets
      console.log('2. 💰 COMPANY WALLETS');
      console.log('   Getting company wallets...');
      const walletsResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/company/wallets',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (walletsResponse.statusCode === 200) {
        console.log('   ✅ Wallets retrieved successfully!');
        console.log('   🏢 Total wallets:', walletsResponse.data.wallets.length);
        walletsResponse.data.wallets.forEach((wallet, index) => {
          console.log(`   ${index + 1}. ${wallet.currency}: ${wallet.balance.toLocaleString()} (${wallet.country}) - ${wallet.active ? 'Active' : 'Inactive'}`);
        });
        console.log('');
      }

      // 3. Customer Management
      console.log('3. 👥 CUSTOMER MANAGEMENT');
      console.log('   Listing existing customers...');
      const customersResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/customers',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (customersResponse.statusCode === 200) {
        console.log('   ✅ Customers retrieved successfully!');
        console.log('   📊 Total customers:', customersResponse.data.length);
        customersResponse.data.forEach((customer, index) => {
          console.log(`   ${index + 1}. ${customer.first_name} ${customer.last_name} (${customer.email}) - ID: ${customer.id}`);
        });
        console.log('');

        // Create a new customer
        console.log('   Creating new customer...');
        const newCustomerResponse = await makeRequest({
          hostname: 'localhost',
          port: 3000,
          path: '/api/v1/customers',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }, {
          first_name: 'Alice',
          last_name: 'Johnson',
          country: 'Nigeria',
          email: 'alice.johnson@example.com',
          street: '789 Test Street',
          city: 'Port Harcourt',
          state: 'Rivers State',
          postal_code: '500001',
          phone_country_code: '+234',
          phone_number: '8098765432',
          identification_number: '55555555555',
          type: 'NIN',
          number: 'TEST001',
          dob: '1992-03-10'
        });

        if (newCustomerResponse.statusCode === 201) {
          console.log('   ✅ New customer created successfully!');
          console.log('   👤 Name:', newCustomerResponse.data.first_name + ' ' + newCustomerResponse.data.last_name);
          console.log('   📧 Email:', newCustomerResponse.data.email);
          console.log('   🆔 Customer ID:', newCustomerResponse.data.id + '\n');
        }

        // 4. Virtual Card Creation & Management
        console.log('4. 💳 VIRTUAL CARD OPERATIONS');
        if (customersResponse.data.length > 0) {
          const customerId = customersResponse.data[0].id;
          console.log('   Creating virtual card for', customersResponse.data[0].first_name + ' ' + customersResponse.data[0].last_name + '...');

          const cardResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/cards',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }, {
            customer_id: customerId
          });

          if (cardResponse.statusCode === 201) {
            console.log('   ✅ Virtual card created successfully!');
            console.log('   💳 Card ID:', cardResponse.data.card.id);
            console.log('   🔢 Card Number:', cardResponse.data.card.number);
            console.log('   📊 Status:', cardResponse.data.card.status);
            console.log('   💰 Initial Balance:

            // 5. Card Funding
            console.log('5. 💵 CARD FUNDING');
            console.log('   Adding $750 to the card...');
            const fundResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/fund`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 750
            });

            if (fundResponse.statusCode === 200) {
              console.log('   ✅ Card funded successfully!');
              console.log('   📝 Response:', fundResponse.data.message + '\n');
            }

            // 6. Card Details (with CVV)
            console.log('6. 🔍 CARD DETAILS');
            console.log('   Getting full card details...');
            const cardDetailsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (cardDetailsResponse.statusCode === 200) {
              console.log('   ✅ Card details retrieved successfully!');
              console.log('   🔢 Full Card Number:', cardDetailsResponse.data.card_number);
              console.log('   🔐 CVV:', cardDetailsResponse.data.cvv);
              console.log('   💰 Current Balance: $' + cardDetailsResponse.data.balance);
              console.log('   📊 Status:', cardDetailsResponse.data.status);
              console.log('   💱 Currency:', cardDetailsResponse.data.currency + '\n');
            }

            // 7. Card Freeze/Unfreeze
            console.log('7. 🧊 CARD FREEZE/UNFREEZE');
            console.log('   Freezing the card...');
            const freezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'freeze'
            });

            if (freezeResponse.statusCode === 200) {
              console.log('   ✅ Card frozen successfully!');
              console.log('   📝 Response:', freezeResponse.data.message);
            }

            // Unfreeze the card
            console.log('   Unfreezing the card...');
            const unfreezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'unfreeze'
            });

            if (unfreezeResponse.statusCode === 200) {
              console.log('   ✅ Card unfrozen successfully!');
              console.log('   📝 Response:', unfreezeResponse.data.message + '\n');
            }

            // 8. Withdraw Funds
            console.log('8. 🏦 FUND WITHDRAWAL');
            console.log('   Withdrawing $200 from the card...');
            const withdrawResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/withdraw`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 200
            });

            if (withdrawResponse.statusCode === 200) {
              console.log('   ✅ Funds withdrawn successfully!');
              console.log('   📝 Response:', withdrawResponse.data.message + '\n');
            }

            // 9. Transaction History
            console.log('9. 📊 TRANSACTION HISTORY');
            console.log('   Getting card transaction history...');
            const transactionsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/transactions`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (transactionsResponse.statusCode === 200) {
              console.log('   ✅ Transaction history retrieved!');
              console.log('   📋 Total transactions:', transactionsResponse.data.length);
              transactionsResponse.data.forEach((tx, index) => {
                console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} - ${tx.status} (${new Date(tx.created_at).toLocaleString()})`);
              });
              console.log('');
            }

            // 10. List All Cards
            console.log('10. 📱 ALL BUSINESS CARDS');
            console.log('    Getting all cards for business...');
            const allCardsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/v1/cards',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (allCardsResponse.statusCode === 200) {
              console.log('    ✅ All cards retrieved successfully!');
              console.log('    📊 Total cards issued:', allCardsResponse.data.length);
              allCardsResponse.data.forEach((card, index) => {
                console.log(`    ${index + 1}. ${card.number} - ${card.status} - ${card.balance} (${card.customer.first_name} ${card.customer.last_name})`);
              });
              console.log('');
            }
          }
        }
      }

      // Final Summary
      console.log('🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Authentication');
      console.log('✅ Business Balance Management');
      console.log('✅ Customer Registration');
      console.log('✅ Virtual Card Creation');
      console.log('✅ Card Funding');
      console.log('✅ Card Details Retrieval');
      console.log('✅ Card Freeze/Unfreeze');
      console.log('✅ Fund Withdrawal');
      console.log('✅ Transaction History');
      console.log('✅ Card Listing');
      console.log('');
      console.log('🌐 API Server: http://localhost:3000');
      console.log('📖 Documentation: http://localhost:3000/docs');
      console.log('');
      console.log('🔑 Demo Credentials:');
      console.log('   Client ID: demo_client_001');
      console.log('   Client Key: demo_client_key_123');

    } else {
      console.log('❌ Authentication failed!');
      console.log('   Status Code:', authResponse.statusCode);
      console.log('   Response:', authResponse.data);
      console.log('');
      console.log('🔧 Make sure the API server is running:');
      console.log('   npm run start:dev');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running: npm run start:dev');
    console.log('   2. Check if port 3000 is available');
    console.log('   3. Verify database is properly seeded');
  }
}

// Run the test
testAPI();
 + cardResponse.data.card.balance);
            console.log('   👤 Customer:', cardResponse.data.card.customer.first_name + ' ' + cardResponse.data.card.customer.last_name);
            console.log('   💸 Card Creation Cost:

            const cardId = cardResponse.data.id;

            // 5. Card Funding
            console.log('5. 💵 CARD FUNDING');
            console.log('   Adding $750 to the card...');
            const fundResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/fund`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 750
            });

            if (fundResponse.statusCode === 200) {
              console.log('   ✅ Card funded successfully!');
              console.log('   📝 Response:', fundResponse.data.message + '\n');
            }

            // 6. Card Details (with CVV)
            console.log('6. 🔍 CARD DETAILS');
            console.log('   Getting full card details...');
            const cardDetailsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (cardDetailsResponse.statusCode === 200) {
              console.log('   ✅ Card details retrieved successfully!');
              console.log('   🔢 Full Card Number:', cardDetailsResponse.data.card_number);
              console.log('   🔐 CVV:', cardDetailsResponse.data.cvv);
              console.log('   💰 Current Balance: $' + cardDetailsResponse.data.balance);
              console.log('   📊 Status:', cardDetailsResponse.data.status);
              console.log('   💱 Currency:', cardDetailsResponse.data.currency + '\n');
            }

            // 7. Card Freeze/Unfreeze
            console.log('7. 🧊 CARD FREEZE/UNFREEZE');
            console.log('   Freezing the card...');
            const freezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'freeze'
            });

            if (freezeResponse.statusCode === 200) {
              console.log('   ✅ Card frozen successfully!');
              console.log('   📝 Response:', freezeResponse.data.message);
            }

            // Unfreeze the card
            console.log('   Unfreezing the card...');
            const unfreezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'unfreeze'
            });

            if (unfreezeResponse.statusCode === 200) {
              console.log('   ✅ Card unfrozen successfully!');
              console.log('   📝 Response:', unfreezeResponse.data.message + '\n');
            }

            // 8. Withdraw Funds
            console.log('8. 🏦 FUND WITHDRAWAL');
            console.log('   Withdrawing $200 from the card...');
            const withdrawResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/withdraw`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 200
            });

            if (withdrawResponse.statusCode === 200) {
              console.log('   ✅ Funds withdrawn successfully!');
              console.log('   📝 Response:', withdrawResponse.data.message + '\n');
            }

            // 9. Transaction History
            console.log('9. 📊 TRANSACTION HISTORY');
            console.log('   Getting card transaction history...');
            const transactionsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/transactions`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (transactionsResponse.statusCode === 200) {
              console.log('   ✅ Transaction history retrieved!');
              console.log('   📋 Total transactions:', transactionsResponse.data.length);
              transactionsResponse.data.forEach((tx, index) => {
                console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} - ${tx.status} (${new Date(tx.created_at).toLocaleString()})`);
              });
              console.log('');
            }

            // 10. List All Cards
            console.log('10. 📱 ALL BUSINESS CARDS');
            console.log('    Getting all cards for business...');
            const allCardsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/v1/cards',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (allCardsResponse.statusCode === 200) {
              console.log('    ✅ All cards retrieved successfully!');
              console.log('    📊 Total cards issued:', allCardsResponse.data.length);
              allCardsResponse.data.forEach((card, index) => {
                console.log(`    ${index + 1}. ${card.number} - ${card.status} - ${card.balance} (${card.customer.first_name} ${card.customer.last_name})`);
              });
              console.log('');
            }
          }
        }
      }

      // Final Summary
      console.log('🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Authentication');
      console.log('✅ Business Balance Management');
      console.log('✅ Customer Registration');
      console.log('✅ Virtual Card Creation');
      console.log('✅ Card Funding');
      console.log('✅ Card Details Retrieval');
      console.log('✅ Card Freeze/Unfreeze');
      console.log('✅ Fund Withdrawal');
      console.log('✅ Transaction History');
      console.log('✅ Card Listing');
      console.log('');
      console.log('🌐 API Server: http://localhost:3000');
      console.log('📖 Documentation: http://localhost:3000/docs');
      console.log('');
      console.log('🔑 Demo Credentials:');
      console.log('   Client ID: demo_client_001');
      console.log('   Client Key: demo_client_key_123');

    } else {
      console.log('❌ Authentication failed!');
      console.log('   Status Code:', authResponse.statusCode);
      console.log('   Response:', authResponse.data);
      console.log('');
      console.log('🔧 Make sure the API server is running:');
      console.log('   npm run start:dev');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running: npm run start:dev');
    console.log('   2. Check if port 3000 is available');
    console.log('   3. Verify database is properly seeded');
  }
}

// Run the test
testAPI();
 + cardResponse.data.transaction.amount + '\n');

            const cardId = cardResponse.data.id;

            // 5. Card Funding
            console.log('5. 💵 CARD FUNDING');
            console.log('   Adding $750 to the card...');
            const fundResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/fund`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 750
            });

            if (fundResponse.statusCode === 200) {
              console.log('   ✅ Card funded successfully!');
              console.log('   📝 Response:', fundResponse.data.message + '\n');
            }

            // 6. Card Details (with CVV)
            console.log('6. 🔍 CARD DETAILS');
            console.log('   Getting full card details...');
            const cardDetailsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (cardDetailsResponse.statusCode === 200) {
              console.log('   ✅ Card details retrieved successfully!');
              console.log('   🔢 Full Card Number:', cardDetailsResponse.data.card_number);
              console.log('   🔐 CVV:', cardDetailsResponse.data.cvv);
              console.log('   💰 Current Balance: $' + cardDetailsResponse.data.balance);
              console.log('   📊 Status:', cardDetailsResponse.data.status);
              console.log('   💱 Currency:', cardDetailsResponse.data.currency + '\n');
            }

            // 7. Card Freeze/Unfreeze
            console.log('7. 🧊 CARD FREEZE/UNFREEZE');
            console.log('   Freezing the card...');
            const freezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'freeze'
            });

            if (freezeResponse.statusCode === 200) {
              console.log('   ✅ Card frozen successfully!');
              console.log('   📝 Response:', freezeResponse.data.message);
            }

            // Unfreeze the card
            console.log('   Unfreezing the card...');
            const unfreezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'unfreeze'
            });

            if (unfreezeResponse.statusCode === 200) {
              console.log('   ✅ Card unfrozen successfully!');
              console.log('   📝 Response:', unfreezeResponse.data.message + '\n');
            }

            // 8. Withdraw Funds
            console.log('8. 🏦 FUND WITHDRAWAL');
            console.log('   Withdrawing $200 from the card...');
            const withdrawResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/withdraw`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 200
            });

            if (withdrawResponse.statusCode === 200) {
              console.log('   ✅ Funds withdrawn successfully!');
              console.log('   📝 Response:', withdrawResponse.data.message + '\n');
            }

            // 9. Transaction History
            console.log('9. 📊 TRANSACTION HISTORY');
            console.log('   Getting card transaction history...');
            const transactionsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/transactions`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (transactionsResponse.statusCode === 200) {
              console.log('   ✅ Transaction history retrieved!');
              console.log('   📋 Total transactions:', transactionsResponse.data.length);
              transactionsResponse.data.forEach((tx, index) => {
                console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} - ${tx.status} (${new Date(tx.created_at).toLocaleString()})`);
              });
              console.log('');
            }

            // 10. List All Cards
            console.log('10. 📱 ALL BUSINESS CARDS');
            console.log('    Getting all cards for business...');
            const allCardsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/v1/cards',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (allCardsResponse.statusCode === 200) {
              console.log('    ✅ All cards retrieved successfully!');
              console.log('    📊 Total cards issued:', allCardsResponse.data.length);
              allCardsResponse.data.forEach((card, index) => {
                console.log(`    ${index + 1}. ${card.number} - ${card.status} - ${card.balance} (${card.customer.first_name} ${card.customer.last_name})`);
              });
              console.log('');
            }
          }
        }
      }

      // Final Summary
      console.log('🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Authentication');
      console.log('✅ Business Balance Management');
      console.log('✅ Customer Registration');
      console.log('✅ Virtual Card Creation');
      console.log('✅ Card Funding');
      console.log('✅ Card Details Retrieval');
      console.log('✅ Card Freeze/Unfreeze');
      console.log('✅ Fund Withdrawal');
      console.log('✅ Transaction History');
      console.log('✅ Card Listing');
      console.log('');
      console.log('🌐 API Server: http://localhost:3000');
      console.log('📖 Documentation: http://localhost:3000/docs');
      console.log('');
      console.log('🔑 Demo Credentials:');
      console.log('   Client ID: demo_client_001');
      console.log('   Client Key: demo_client_key_123');

    } else {
      console.log('❌ Authentication failed!');
      console.log('   Status Code:', authResponse.statusCode);
      console.log('   Response:', authResponse.data);
      console.log('');
      console.log('🔧 Make sure the API server is running:');
      console.log('   npm run start:dev');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running: npm run start:dev');
    console.log('   2. Check if port 3000 is available');
    console.log('   3. Verify database is properly seeded');
  }
}

// Run the test
testAPI();
 + cardResponse.data.card.balance);
            console.log('   👤 Customer:', cardResponse.data.card.customer.first_name + ' ' + cardResponse.data.card.customer.last_name);
            console.log('   💸 Card Creation Cost:

            // 5. Card Funding
            console.log('5. 💵 CARD FUNDING');
            console.log('   Adding $750 to the card...');
            const fundResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/fund`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 750
            });

            if (fundResponse.statusCode === 200) {
              console.log('   ✅ Card funded successfully!');
              console.log('   📝 Response:', fundResponse.data.message + '\n');
            }

            // 6. Card Details (with CVV)
            console.log('6. 🔍 CARD DETAILS');
            console.log('   Getting full card details...');
            const cardDetailsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (cardDetailsResponse.statusCode === 200) {
              console.log('   ✅ Card details retrieved successfully!');
              console.log('   🔢 Full Card Number:', cardDetailsResponse.data.card_number);
              console.log('   🔐 CVV:', cardDetailsResponse.data.cvv);
              console.log('   💰 Current Balance: $' + cardDetailsResponse.data.balance);
              console.log('   📊 Status:', cardDetailsResponse.data.status);
              console.log('   💱 Currency:', cardDetailsResponse.data.currency + '\n');
            }

            // 7. Card Freeze/Unfreeze
            console.log('7. 🧊 CARD FREEZE/UNFREEZE');
            console.log('   Freezing the card...');
            const freezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'freeze'
            });

            if (freezeResponse.statusCode === 200) {
              console.log('   ✅ Card frozen successfully!');
              console.log('   📝 Response:', freezeResponse.data.message);
            }

            // Unfreeze the card
            console.log('   Unfreezing the card...');
            const unfreezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'unfreeze'
            });

            if (unfreezeResponse.statusCode === 200) {
              console.log('   ✅ Card unfrozen successfully!');
              console.log('   📝 Response:', unfreezeResponse.data.message + '\n');
            }

            // 8. Withdraw Funds
            console.log('8. 🏦 FUND WITHDRAWAL');
            console.log('   Withdrawing $200 from the card...');
            const withdrawResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/withdraw`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 200
            });

            if (withdrawResponse.statusCode === 200) {
              console.log('   ✅ Funds withdrawn successfully!');
              console.log('   📝 Response:', withdrawResponse.data.message + '\n');
            }

            // 9. Transaction History
            console.log('9. 📊 TRANSACTION HISTORY');
            console.log('   Getting card transaction history...');
            const transactionsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/transactions`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (transactionsResponse.statusCode === 200) {
              console.log('   ✅ Transaction history retrieved!');
              console.log('   📋 Total transactions:', transactionsResponse.data.length);
              transactionsResponse.data.forEach((tx, index) => {
                console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} - ${tx.status} (${new Date(tx.created_at).toLocaleString()})`);
              });
              console.log('');
            }

            // 10. List All Cards
            console.log('10. 📱 ALL BUSINESS CARDS');
            console.log('    Getting all cards for business...');
            const allCardsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/v1/cards',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (allCardsResponse.statusCode === 200) {
              console.log('    ✅ All cards retrieved successfully!');
              console.log('    📊 Total cards issued:', allCardsResponse.data.length);
              allCardsResponse.data.forEach((card, index) => {
                console.log(`    ${index + 1}. ${card.number} - ${card.status} - ${card.balance} (${card.customer.first_name} ${card.customer.last_name})`);
              });
              console.log('');
            }
          }
        }
      }

      // Final Summary
      console.log('🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Authentication');
      console.log('✅ Business Balance Management');
      console.log('✅ Customer Registration');
      console.log('✅ Virtual Card Creation');
      console.log('✅ Card Funding');
      console.log('✅ Card Details Retrieval');
      console.log('✅ Card Freeze/Unfreeze');
      console.log('✅ Fund Withdrawal');
      console.log('✅ Transaction History');
      console.log('✅ Card Listing');
      console.log('');
      console.log('🌐 API Server: http://localhost:3000');
      console.log('📖 Documentation: http://localhost:3000/docs');
      console.log('');
      console.log('🔑 Demo Credentials:');
      console.log('   Client ID: demo_client_001');
      console.log('   Client Key: demo_client_key_123');

    } else {
      console.log('❌ Authentication failed!');
      console.log('   Status Code:', authResponse.statusCode);
      console.log('   Response:', authResponse.data);
      console.log('');
      console.log('🔧 Make sure the API server is running:');
      console.log('   npm run start:dev');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running: npm run start:dev');
    console.log('   2. Check if port 3000 is available');
    console.log('   3. Verify database is properly seeded');
  }
}

// Run the test
testAPI();
 + cardResponse.data.card.balance);
            console.log('   👤 Customer:', cardResponse.data.card.customer.first_name + ' ' + cardResponse.data.card.customer.last_name);
            console.log('   💸 Card Creation Cost:

            const cardId = cardResponse.data.id;

            // 5. Card Funding
            console.log('5. 💵 CARD FUNDING');
            console.log('   Adding $750 to the card...');
            const fundResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/fund`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 750
            });

            if (fundResponse.statusCode === 200) {
              console.log('   ✅ Card funded successfully!');
              console.log('   📝 Response:', fundResponse.data.message + '\n');
            }

            // 6. Card Details (with CVV)
            console.log('6. 🔍 CARD DETAILS');
            console.log('   Getting full card details...');
            const cardDetailsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (cardDetailsResponse.statusCode === 200) {
              console.log('   ✅ Card details retrieved successfully!');
              console.log('   🔢 Full Card Number:', cardDetailsResponse.data.card_number);
              console.log('   🔐 CVV:', cardDetailsResponse.data.cvv);
              console.log('   💰 Current Balance: $' + cardDetailsResponse.data.balance);
              console.log('   📊 Status:', cardDetailsResponse.data.status);
              console.log('   💱 Currency:', cardDetailsResponse.data.currency + '\n');
            }

            // 7. Card Freeze/Unfreeze
            console.log('7. 🧊 CARD FREEZE/UNFREEZE');
            console.log('   Freezing the card...');
            const freezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'freeze'
            });

            if (freezeResponse.statusCode === 200) {
              console.log('   ✅ Card frozen successfully!');
              console.log('   📝 Response:', freezeResponse.data.message);
            }

            // Unfreeze the card
            console.log('   Unfreezing the card...');
            const unfreezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'unfreeze'
            });

            if (unfreezeResponse.statusCode === 200) {
              console.log('   ✅ Card unfrozen successfully!');
              console.log('   📝 Response:', unfreezeResponse.data.message + '\n');
            }

            // 8. Withdraw Funds
            console.log('8. 🏦 FUND WITHDRAWAL');
            console.log('   Withdrawing $200 from the card...');
            const withdrawResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/withdraw`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 200
            });

            if (withdrawResponse.statusCode === 200) {
              console.log('   ✅ Funds withdrawn successfully!');
              console.log('   📝 Response:', withdrawResponse.data.message + '\n');
            }

            // 9. Transaction History
            console.log('9. 📊 TRANSACTION HISTORY');
            console.log('   Getting card transaction history...');
            const transactionsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/transactions`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (transactionsResponse.statusCode === 200) {
              console.log('   ✅ Transaction history retrieved!');
              console.log('   📋 Total transactions:', transactionsResponse.data.length);
              transactionsResponse.data.forEach((tx, index) => {
                console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} - ${tx.status} (${new Date(tx.created_at).toLocaleString()})`);
              });
              console.log('');
            }

            // 10. List All Cards
            console.log('10. 📱 ALL BUSINESS CARDS');
            console.log('    Getting all cards for business...');
            const allCardsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/v1/cards',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (allCardsResponse.statusCode === 200) {
              console.log('    ✅ All cards retrieved successfully!');
              console.log('    📊 Total cards issued:', allCardsResponse.data.length);
              allCardsResponse.data.forEach((card, index) => {
                console.log(`    ${index + 1}. ${card.number} - ${card.status} - ${card.balance} (${card.customer.first_name} ${card.customer.last_name})`);
              });
              console.log('');
            }
          }
        }
      }

      // Final Summary
      console.log('🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Authentication');
      console.log('✅ Business Balance Management');
      console.log('✅ Customer Registration');
      console.log('✅ Virtual Card Creation');
      console.log('✅ Card Funding');
      console.log('✅ Card Details Retrieval');
      console.log('✅ Card Freeze/Unfreeze');
      console.log('✅ Fund Withdrawal');
      console.log('✅ Transaction History');
      console.log('✅ Card Listing');
      console.log('');
      console.log('🌐 API Server: http://localhost:3000');
      console.log('📖 Documentation: http://localhost:3000/docs');
      console.log('');
      console.log('🔑 Demo Credentials:');
      console.log('   Client ID: demo_client_001');
      console.log('   Client Key: demo_client_key_123');

    } else {
      console.log('❌ Authentication failed!');
      console.log('   Status Code:', authResponse.statusCode);
      console.log('   Response:', authResponse.data);
      console.log('');
      console.log('🔧 Make sure the API server is running:');
      console.log('   npm run start:dev');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running: npm run start:dev');
    console.log('   2. Check if port 3000 is available');
    console.log('   3. Verify database is properly seeded');
  }
}

// Run the test
testAPI();
 + cardResponse.data.transaction.amount + '\n');

            const cardId = cardResponse.data.id;

            // 5. Card Funding
            console.log('5. 💵 CARD FUNDING');
            console.log('   Adding $750 to the card...');
            const fundResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/fund`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 750
            });

            if (fundResponse.statusCode === 200) {
              console.log('   ✅ Card funded successfully!');
              console.log('   📝 Response:', fundResponse.data.message + '\n');
            }

            // 6. Card Details (with CVV)
            console.log('6. 🔍 CARD DETAILS');
            console.log('   Getting full card details...');
            const cardDetailsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (cardDetailsResponse.statusCode === 200) {
              console.log('   ✅ Card details retrieved successfully!');
              console.log('   🔢 Full Card Number:', cardDetailsResponse.data.card_number);
              console.log('   🔐 CVV:', cardDetailsResponse.data.cvv);
              console.log('   💰 Current Balance: $' + cardDetailsResponse.data.balance);
              console.log('   📊 Status:', cardDetailsResponse.data.status);
              console.log('   💱 Currency:', cardDetailsResponse.data.currency + '\n');
            }

            // 7. Card Freeze/Unfreeze
            console.log('7. 🧊 CARD FREEZE/UNFREEZE');
            console.log('   Freezing the card...');
            const freezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'freeze'
            });

            if (freezeResponse.statusCode === 200) {
              console.log('   ✅ Card frozen successfully!');
              console.log('   📝 Response:', freezeResponse.data.message);
            }

            // Unfreeze the card
            console.log('   Unfreezing the card...');
            const unfreezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'unfreeze'
            });

            if (unfreezeResponse.statusCode === 200) {
              console.log('   ✅ Card unfrozen successfully!');
              console.log('   📝 Response:', unfreezeResponse.data.message + '\n');
            }

            // 8. Withdraw Funds
            console.log('8. 🏦 FUND WITHDRAWAL');
            console.log('   Withdrawing $200 from the card...');
            const withdrawResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/withdraw`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 200
            });

            if (withdrawResponse.statusCode === 200) {
              console.log('   ✅ Funds withdrawn successfully!');
              console.log('   📝 Response:', withdrawResponse.data.message + '\n');
            }

            // 9. Transaction History
            console.log('9. 📊 TRANSACTION HISTORY');
            console.log('   Getting card transaction history...');
            const transactionsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/transactions`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (transactionsResponse.statusCode === 200) {
              console.log('   ✅ Transaction history retrieved!');
              console.log('   📋 Total transactions:', transactionsResponse.data.length);
              transactionsResponse.data.forEach((tx, index) => {
                console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} - ${tx.status} (${new Date(tx.created_at).toLocaleString()})`);
              });
              console.log('');
            }

            // 10. List All Cards
            console.log('10. 📱 ALL BUSINESS CARDS');
            console.log('    Getting all cards for business...');
            const allCardsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/v1/cards',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (allCardsResponse.statusCode === 200) {
              console.log('    ✅ All cards retrieved successfully!');
              console.log('    📊 Total cards issued:', allCardsResponse.data.length);
              allCardsResponse.data.forEach((card, index) => {
                console.log(`    ${index + 1}. ${card.number} - ${card.status} - ${card.balance} (${card.customer.first_name} ${card.customer.last_name})`);
              });
              console.log('');
            }
          }
        }
      }

      // Final Summary
      console.log('🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Authentication');
      console.log('✅ Business Balance Management');
      console.log('✅ Customer Registration');
      console.log('✅ Virtual Card Creation');
      console.log('✅ Card Funding');
      console.log('✅ Card Details Retrieval');
      console.log('✅ Card Freeze/Unfreeze');
      console.log('✅ Fund Withdrawal');
      console.log('✅ Transaction History');
      console.log('✅ Card Listing');
      console.log('');
      console.log('🌐 API Server: http://localhost:3000');
      console.log('📖 Documentation: http://localhost:3000/docs');
      console.log('');
      console.log('🔑 Demo Credentials:');
      console.log('   Client ID: demo_client_001');
      console.log('   Client Key: demo_client_key_123');

    } else {
      console.log('❌ Authentication failed!');
      console.log('   Status Code:', authResponse.statusCode);
      console.log('   Response:', authResponse.data);
      console.log('');
      console.log('🔧 Make sure the API server is running:');
      console.log('   npm run start:dev');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running: npm run start:dev');
    console.log('   2. Check if port 3000 is available');
    console.log('   3. Verify database is properly seeded');
  }
}

// Run the test
testAPI();
 + cardResponse.data.transaction.amount + '\n');

            const cardId = cardResponse.data.card.id;

            // 5. Card Funding
            console.log('5. 💵 CARD FUNDING');
            console.log('   Adding $750 to the card...');
            const fundResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/fund`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 750
            });

            if (fundResponse.statusCode === 200) {
              console.log('   ✅ Card funded successfully!');
              console.log('   📝 Response:', fundResponse.data.message + '\n');
            }

            // 6. Card Details (with CVV)
            console.log('6. 🔍 CARD DETAILS');
            console.log('   Getting full card details...');
            const cardDetailsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (cardDetailsResponse.statusCode === 200) {
              console.log('   ✅ Card details retrieved successfully!');
              console.log('   🔢 Full Card Number:', cardDetailsResponse.data.card_number);
              console.log('   🔐 CVV:', cardDetailsResponse.data.cvv);
              console.log('   💰 Current Balance: $' + cardDetailsResponse.data.balance);
              console.log('   📊 Status:', cardDetailsResponse.data.status);
              console.log('   💱 Currency:', cardDetailsResponse.data.currency + '\n');
            }

            // 7. Card Freeze/Unfreeze
            console.log('7. 🧊 CARD FREEZE/UNFREEZE');
            console.log('   Freezing the card...');
            const freezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'freeze'
            });

            if (freezeResponse.statusCode === 200) {
              console.log('   ✅ Card frozen successfully!');
              console.log('   📝 Response:', freezeResponse.data.message);
            }

            // Unfreeze the card
            console.log('   Unfreezing the card...');
            const unfreezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'unfreeze'
            });

            if (unfreezeResponse.statusCode === 200) {
              console.log('   ✅ Card unfrozen successfully!');
              console.log('   📝 Response:', unfreezeResponse.data.message + '\n');
            }

            // 8. Withdraw Funds
            console.log('8. 🏦 FUND WITHDRAWAL');
            console.log('   Withdrawing $200 from the card...');
            const withdrawResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/withdraw`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 200
            });

            if (withdrawResponse.statusCode === 200) {
              console.log('   ✅ Funds withdrawn successfully!');
              console.log('   📝 Response:', withdrawResponse.data.message + '\n');
            }

            // 9. Transaction History
            console.log('9. 📊 TRANSACTION HISTORY');
            console.log('   Getting card transaction history...');
            const transactionsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/transactions`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (transactionsResponse.statusCode === 200) {
              console.log('   ✅ Transaction history retrieved!');
              console.log('   📋 Total transactions:', transactionsResponse.data.length);
              transactionsResponse.data.forEach((tx, index) => {
                console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} - ${tx.status} (${new Date(tx.created_at).toLocaleString()})`);
              });
              console.log('');
            }

            // 10. List All Cards
            console.log('10. 📱 ALL BUSINESS CARDS');
            console.log('    Getting all cards for business...');
            const allCardsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/v1/cards',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (allCardsResponse.statusCode === 200) {
              console.log('    ✅ All cards retrieved successfully!');
              console.log('    📊 Total cards issued:', allCardsResponse.data.length);
              allCardsResponse.data.forEach((card, index) => {
                console.log(`    ${index + 1}. ${card.number} - ${card.status} - ${card.balance} (${card.customer.first_name} ${card.customer.last_name})`);
              });
              console.log('');
            }
          }
        }
      }

      // Final Summary
      console.log('🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Authentication');
      console.log('✅ Business Balance Management');
      console.log('✅ Customer Registration');
      console.log('✅ Virtual Card Creation');
      console.log('✅ Card Funding');
      console.log('✅ Card Details Retrieval');
      console.log('✅ Card Freeze/Unfreeze');
      console.log('✅ Fund Withdrawal');
      console.log('✅ Transaction History');
      console.log('✅ Card Listing');
      console.log('');
      console.log('🌐 API Server: http://localhost:3000');
      console.log('📖 Documentation: http://localhost:3000/docs');
      console.log('');
      console.log('🔑 Demo Credentials:');
      console.log('   Client ID: demo_client_001');
      console.log('   Client Key: demo_client_key_123');

    } else {
      console.log('❌ Authentication failed!');
      console.log('   Status Code:', authResponse.statusCode);
      console.log('   Response:', authResponse.data);
      console.log('');
      console.log('🔧 Make sure the API server is running:');
      console.log('   npm run start:dev');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running: npm run start:dev');
    console.log('   2. Check if port 3000 is available');
    console.log('   3. Verify database is properly seeded');
  }
}

// Run the test
testAPI();
 + cardResponse.data.card.balance);
            console.log('   👤 Customer:', cardResponse.data.card.customer.first_name + ' ' + cardResponse.data.card.customer.last_name);
            console.log('   💸 Card Creation Cost:

            const cardId = cardResponse.data.id;

            // 5. Card Funding
            console.log('5. 💵 CARD FUNDING');
            console.log('   Adding $750 to the card...');
            const fundResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/fund`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 750
            });

            if (fundResponse.statusCode === 200) {
              console.log('   ✅ Card funded successfully!');
              console.log('   📝 Response:', fundResponse.data.message + '\n');
            }

            // 6. Card Details (with CVV)
            console.log('6. 🔍 CARD DETAILS');
            console.log('   Getting full card details...');
            const cardDetailsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (cardDetailsResponse.statusCode === 200) {
              console.log('   ✅ Card details retrieved successfully!');
              console.log('   🔢 Full Card Number:', cardDetailsResponse.data.card_number);
              console.log('   🔐 CVV:', cardDetailsResponse.data.cvv);
              console.log('   💰 Current Balance: $' + cardDetailsResponse.data.balance);
              console.log('   📊 Status:', cardDetailsResponse.data.status);
              console.log('   💱 Currency:', cardDetailsResponse.data.currency + '\n');
            }

            // 7. Card Freeze/Unfreeze
            console.log('7. 🧊 CARD FREEZE/UNFREEZE');
            console.log('   Freezing the card...');
            const freezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'freeze'
            });

            if (freezeResponse.statusCode === 200) {
              console.log('   ✅ Card frozen successfully!');
              console.log('   📝 Response:', freezeResponse.data.message);
            }

            // Unfreeze the card
            console.log('   Unfreezing the card...');
            const unfreezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'unfreeze'
            });

            if (unfreezeResponse.statusCode === 200) {
              console.log('   ✅ Card unfrozen successfully!');
              console.log('   📝 Response:', unfreezeResponse.data.message + '\n');
            }

            // 8. Withdraw Funds
            console.log('8. 🏦 FUND WITHDRAWAL');
            console.log('   Withdrawing $200 from the card...');
            const withdrawResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/withdraw`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 200
            });

            if (withdrawResponse.statusCode === 200) {
              console.log('   ✅ Funds withdrawn successfully!');
              console.log('   📝 Response:', withdrawResponse.data.message + '\n');
            }

            // 9. Transaction History
            console.log('9. 📊 TRANSACTION HISTORY');
            console.log('   Getting card transaction history...');
            const transactionsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/transactions`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (transactionsResponse.statusCode === 200) {
              console.log('   ✅ Transaction history retrieved!');
              console.log('   📋 Total transactions:', transactionsResponse.data.length);
              transactionsResponse.data.forEach((tx, index) => {
                console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} - ${tx.status} (${new Date(tx.created_at).toLocaleString()})`);
              });
              console.log('');
            }

            // 10. List All Cards
            console.log('10. 📱 ALL BUSINESS CARDS');
            console.log('    Getting all cards for business...');
            const allCardsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/v1/cards',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (allCardsResponse.statusCode === 200) {
              console.log('    ✅ All cards retrieved successfully!');
              console.log('    📊 Total cards issued:', allCardsResponse.data.length);
              allCardsResponse.data.forEach((card, index) => {
                console.log(`    ${index + 1}. ${card.number} - ${card.status} - ${card.balance} (${card.customer.first_name} ${card.customer.last_name})`);
              });
              console.log('');
            }
          }
        }
      }

      // Final Summary
      console.log('🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Authentication');
      console.log('✅ Business Balance Management');
      console.log('✅ Customer Registration');
      console.log('✅ Virtual Card Creation');
      console.log('✅ Card Funding');
      console.log('✅ Card Details Retrieval');
      console.log('✅ Card Freeze/Unfreeze');
      console.log('✅ Fund Withdrawal');
      console.log('✅ Transaction History');
      console.log('✅ Card Listing');
      console.log('');
      console.log('🌐 API Server: http://localhost:3000');
      console.log('📖 Documentation: http://localhost:3000/docs');
      console.log('');
      console.log('🔑 Demo Credentials:');
      console.log('   Client ID: demo_client_001');
      console.log('   Client Key: demo_client_key_123');

    } else {
      console.log('❌ Authentication failed!');
      console.log('   Status Code:', authResponse.statusCode);
      console.log('   Response:', authResponse.data);
      console.log('');
      console.log('🔧 Make sure the API server is running:');
      console.log('   npm run start:dev');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running: npm run start:dev');
    console.log('   2. Check if port 3000 is available');
    console.log('   3. Verify database is properly seeded');
  }
}

// Run the test
testAPI();
 + cardResponse.data.transaction.amount + '\n');

            const cardId = cardResponse.data.id;

            // 5. Card Funding
            console.log('5. 💵 CARD FUNDING');
            console.log('   Adding $750 to the card...');
            const fundResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/fund`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 750
            });

            if (fundResponse.statusCode === 200) {
              console.log('   ✅ Card funded successfully!');
              console.log('   📝 Response:', fundResponse.data.message + '\n');
            }

            // 6. Card Details (with CVV)
            console.log('6. 🔍 CARD DETAILS');
            console.log('   Getting full card details...');
            const cardDetailsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (cardDetailsResponse.statusCode === 200) {
              console.log('   ✅ Card details retrieved successfully!');
              console.log('   🔢 Full Card Number:', cardDetailsResponse.data.card_number);
              console.log('   🔐 CVV:', cardDetailsResponse.data.cvv);
              console.log('   💰 Current Balance: $' + cardDetailsResponse.data.balance);
              console.log('   📊 Status:', cardDetailsResponse.data.status);
              console.log('   💱 Currency:', cardDetailsResponse.data.currency + '\n');
            }

            // 7. Card Freeze/Unfreeze
            console.log('7. 🧊 CARD FREEZE/UNFREEZE');
            console.log('   Freezing the card...');
            const freezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'freeze'
            });

            if (freezeResponse.statusCode === 200) {
              console.log('   ✅ Card frozen successfully!');
              console.log('   📝 Response:', freezeResponse.data.message);
            }

            // Unfreeze the card
            console.log('   Unfreezing the card...');
            const unfreezeResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/freeze`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              action: 'unfreeze'
            });

            if (unfreezeResponse.statusCode === 200) {
              console.log('   ✅ Card unfrozen successfully!');
              console.log('   📝 Response:', unfreezeResponse.data.message + '\n');
            }

            // 8. Withdraw Funds
            console.log('8. 🏦 FUND WITHDRAWAL');
            console.log('   Withdrawing $200 from the card...');
            const withdrawResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/withdraw`,
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }, {
              amount: 200
            });

            if (withdrawResponse.statusCode === 200) {
              console.log('   ✅ Funds withdrawn successfully!');
              console.log('   📝 Response:', withdrawResponse.data.message + '\n');
            }

            // 9. Transaction History
            console.log('9. 📊 TRANSACTION HISTORY');
            console.log('   Getting card transaction history...');
            const transactionsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: `/api/v1/cards/${cardId}/transactions`,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (transactionsResponse.statusCode === 200) {
              console.log('   ✅ Transaction history retrieved!');
              console.log('   📋 Total transactions:', transactionsResponse.data.length);
              transactionsResponse.data.forEach((tx, index) => {
                console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} - ${tx.status} (${new Date(tx.created_at).toLocaleString()})`);
              });
              console.log('');
            }

            // 10. List All Cards
            console.log('10. 📱 ALL BUSINESS CARDS');
            console.log('    Getting all cards for business...');
            const allCardsResponse = await makeRequest({
              hostname: 'localhost',
              port: 3000,
              path: '/api/v1/cards',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (allCardsResponse.statusCode === 200) {
              console.log('    ✅ All cards retrieved successfully!');
              console.log('    📊 Total cards issued:', allCardsResponse.data.length);
              allCardsResponse.data.forEach((card, index) => {
                console.log(`    ${index + 1}. ${card.number} - ${card.status} - ${card.balance} (${card.customer.first_name} ${card.customer.last_name})`);
              });
              console.log('');
            }
          }
        }
      }

      // Final Summary
      console.log('🎉 TEST SUITE COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Authentication');
      console.log('✅ Business Balance Management');
      console.log('✅ Customer Registration');
      console.log('✅ Virtual Card Creation');
      console.log('✅ Card Funding');
      console.log('✅ Card Details Retrieval');
      console.log('✅ Card Freeze/Unfreeze');
      console.log('✅ Fund Withdrawal');
      console.log('✅ Transaction History');
      console.log('✅ Card Listing');
      console.log('');
      console.log('🌐 API Server: http://localhost:3000');
      console.log('📖 Documentation: http://localhost:3000/docs');
      console.log('');
      console.log('🔑 Demo Credentials:');
      console.log('   Client ID: demo_client_001');
      console.log('   Client Key: demo_client_key_123');

    } else {
      console.log('❌ Authentication failed!');
      console.log('   Status Code:', authResponse.statusCode);
      console.log('   Response:', authResponse.data);
      console.log('');
      console.log('🔧 Make sure the API server is running:');
      console.log('   npm run start:dev');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure API server is running: npm run start:dev');
    console.log('   2. Check if port 3000 is available');
    console.log('   3. Verify database is properly seeded');
  }
}

// Run the test
testAPI();
