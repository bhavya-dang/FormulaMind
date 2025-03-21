# FormulaMind

> Your AI-powered Formula 1 Companion

FormulaMind is a Retrieval-Augmented Generation (RAG) chatbot focused on Formula 1 racing. The application provides an interactive way to learn about F1 history, statistics, and current events by intelligently retrieving and synthesizing information from its knowledge base.

## Tech Stack

- **Frontend**

  - Next.js 14 (React)
  - TypeScript
  - Tailwind CSS
  - Lucide Icons
  - Vercel (Deployment)

- **Backend & AI**
  - Gemini 2.0 Flash Lite API (OpenRouter)
  - Astra DB (Vector Database)
  - LangChain
  - Xenova Transformers (Text Embeddings)
  - Puppeteer (Web Scraping)

## Live Demo

Visit [formulamind.vercel.app](https://formulamind.vercel.app) to try the live version.

## Features

- AI-powered F1 knowledge base
- Dark/Light mode support
- Interactive chat interface
- Responsive design for all devices (WIP)
- Real-time message streaming
- Message editing and regeneration
- Copy message functionality
- Command system with suggestions
- Modern, clean UI with smooth animations

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn package manager
- OpenRouter API key

### Local Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/bhavya-dang/formulamind.git
   cd formulamind
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory with the following variables:

   ```env
   AI_API_KEY=your_api_key_here
   ASTRA_DB_NAMESPACE="default_keyspace" # do not change this
   ASTRA_DB_COLLECTION=your_collection_name_here
   ASTRA_DB_TOKEN=your_db_token_here
   ASTRA_DB_ENDPOINT_URL=your_astra_db_endpoint_url_here
   ```

4. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Command System

The app includes a command system that can be accessed by typing '@' in the input field:

- `@help` - Shows available commands
- `@clear` - Clears the chat history

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

If you encounter any issues or have questions, please open an issue in the GitHub repository.
