import http from 'http';

function checkUrl(url: string) {
  http.get(url, (res) => {
    console.log(`\nURL: ${url}`);
    console.log('STATUS:', res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('RESPONSE:', data);
    });
  }).on('error', (err) => {
    console.error(`ERROR FETCHING ${url}:`, err.message);
  });
}

checkUrl('http://localhost:3000/api/announcements/1?audience=students');
