# Vim Practice App

An interactive web application for learning Vim commands with user authentication and progress tracking.

## Features

- **Interactive Vim Training**: Practice essential Vim commands with guided exercises
- **User Authentication**: Create accounts and login to save progress
- **Progress Tracking**: Your current exercise is automatically saved per user
- **Completion Detection**: Exercises validate when you achieve the expected result
- **Local Storage**: All data persists in your browser

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/whatfontisthis/vim_practice2.git
cd vim_practice2
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and go to `http://localhost:5173`

## Usage

1. **Create an Account**: Register with email and password
2. **Login**: Sign in to access your saved progress
3. **Practice**: Work through Vim exercises with real-time feedback
4. **Progress**: Your current exercise is automatically saved

## Available Commands

- `j` - Move down one line
- `k` - Move up one line
- `h` - Move left one character
- `l` - Move right one character
- `x` - Delete character under cursor
- `dd` - Delete current line
- `dw` - Delete word from cursor forward
- `diw` - Delete inner word
- `di"` - Delete inside quotes
- `di(` - Delete inside parentheses
- `da(` - Delete around parentheses
- And many more...

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

MIT
