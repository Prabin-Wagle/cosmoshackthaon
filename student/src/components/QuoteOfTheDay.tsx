import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const fallbacks = [
    { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson" },
    { text: "To live is the rarest thing in the world. Most people exist, that is all.", author: "Oscar Wilde" },
    { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
    { text: "Darkness cannot drive out darkness: only light can do that. Hate cannot drive out hate: only love can do that.", author: "Martin Luther King Jr." },
    { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },
    { text: "We accept the love we think we deserve.", author: "Stephen Chbosky" },
    { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
    { text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.", author: "Albert Einstein" },
    { text: "So many books, so little time.", author: "Frank Zappa" },
    { text: "A room without books is like a body without a soul.", author: "Marcus Tullius Cicero" },
    { text: "If you tell the truth, you don't have to remember anything.", author: "Mark Twain" },
];

export default function QuoteOfTheDay() {
    const [quote, setQuote] = useState(fallbacks[new Date().getDate() % fallbacks.length]);

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                // api.quotable.io is currently down/unstable
                // Using a try-catch to silently fail to fallbacks if network is down
                const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://zenquotes.io/api/random'), { signal: AbortSignal.timeout(3000) });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data[0]) {
                        setQuote({ text: data[0].q, author: data[0].a });
                    }
                }
            } catch (error) {
                // Silently fallback to local selection on network error (like ERR_NAME_NOT_RESOLVED)
                console.log('Using local fallback quote');
            }
        };

        fetchQuote();
    }, []);

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 rounded-[2.5rem] p-10 text-white shadow-xl shadow-gray-900/20 group h-full flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4">
                <Quote size={150} />
            </div>

            <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-3 mb-6 bg-white/5 w-fit px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Daily Fuel</span>
                </div>

                <h2 className="text-2xl md:text-3xl font-black mb-4 tracking-tighter leading-tight italic line-clamp-4 group-hover:line-clamp-none transition-all duration-500">
                    "{quote.text}"
                </h2>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">— {quote.author}</p>
            </div>
        </div>
    );
}
