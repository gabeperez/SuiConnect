# SuiConnect

A lightweight, reusable web component for integrating Sui Wallet connectivity into any web application. This library provides easy-to-use functionality for connecting to Sui Wallet and displaying wallet information.

## Features

- Connect to Sui Wallet
- Display wallet balance
- Show transaction history
- View NFTs and tokens
- Easy integration with any web project

## Getting Started

1. Include the necessary files in your project:
```html
<link rel="stylesheet" href="css/suiconnect.css">
<script src="js/suiconnect.js"></script>
```

2. Add the Sui Connect button to your HTML:
```html
<div id="sui-connect"></div>
```

3. Initialize SuiConnect:
```javascript
document.addEventListener('DOMContentLoaded', function() {
    SuiConnect.init();
});
```

## Dependencies

- Sui Wallet Browser Extension
- @mysten/sui.js (loaded via CDN)

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 