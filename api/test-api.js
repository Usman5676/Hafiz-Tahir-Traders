async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: '1234' })
    });
    const loginData = await loginRes.json();
    console.log("Login Token:", loginData.token);

    const prodRes = await fetch('http://localhost:5000/api/products', {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    console.log("Products Status:", prodRes.status);
    const prodData = await prodRes.json();
    console.log("Products Data:", prodData);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
