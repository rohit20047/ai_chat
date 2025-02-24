import { useState, useRef, useEffect } from 'react';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = { text: inputValue, sender: 'user' };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Call the API with the user's question
      const responseData = await fetchAIResponse(inputValue);
      
      // Format the response based on the structure
      const formattedResponse = formatResponse(responseData);
      
      // Add AI response
      const aiMessage = { 
        text: formattedResponse.text, 
        sender: 'ai',
        metadata: formattedResponse.metadata
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      // Add error message
      const errorMessage = { 
        text: 'Sorry, I encountered an error. Please try again.', 
        sender: 'ai', 
        isError: true 
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format the response based on the API response structure
  const formatResponse = (responseData) => {
    // Extract the main answer
    const mainText = responseData.answer || 'No answer provided';
    
    // Prepare metadata for display
    const metadata = {
      type: responseData.type,
      priority: responseData.priority,
      confidence: responseData.confidence,
      sourcesUsed: responseData.sourcesUsed,
      responseTime: responseData.responseTime
    };
    
    return {
      text: mainText,
      metadata
    };
  };

  // Real API call to the specified endpoint
  const fetchAIResponse = async (message) => {
    try {
      const response = await fetch('http://localhost:3000/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: message }),
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Chat header */}
      <div className="bg-white shadow p-4 flex items-center">
        <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
        <h1 className="text-xl font-semibold">AI Chat</h1>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            Send a message to start the conversation
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                  message.sender === 'user' 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : message.isError 
                      ? 'bg-red-100 text-red-800 rounded-bl-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <div>{message.text}</div>
                
                {/* Display metadata if available */}
                {message.metadata && (
                  <div className="mt-2 pt-2 border-t border-gray-300 text-xs">
                    <div className="grid grid-cols-2 gap-1">
                      <div className="text-gray-600">Type:</div>
                      <div>{message.metadata.type}</div>
                      
                      <div className="text-gray-600">Priority:</div>
                      <div>{message.metadata.priority}</div>
                      
                      <div className="text-gray-600">Confidence:</div>
                      <div>{message.metadata.confidence}</div>
                      
                      <div className="text-gray-600">Sources:</div>
                      <div>{message.metadata.sourcesUsed}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg rounded-bl-none max-w-xs flex items-center space-x-2">
              <div className="text-gray-600">AI thinking</div>
              <div className="flex space-x-1">
                <div className="h-2 w-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-2 w-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <div className="h-2 w-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <form onSubmit={handleSubmit} className="bg-white p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className={`bg-blue-500 text-white rounded-full px-5 py-2 font-medium ${
              isLoading || !inputValue.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;