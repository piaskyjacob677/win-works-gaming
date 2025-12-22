const fetch = require('node-fetch');
const options = {method: 'GET', headers: {Authorization: 'Bearer ce4eb46127547da82a56ed22e14b4d0dd2120942748c5684abea2db23599213d'}};

(async () => {
  // Add country_code parameter (e.g., 'us' for United States)
  const response = await fetch('https://api.brightdata.com/cities?country=us', options);
  
  if (!response.ok) {
    const text = await response.text();
    console.error(`Error ${response.status}: ${text}`);
    return;
  }
  
  const data = await response.json();
  console.log(data);
})();
