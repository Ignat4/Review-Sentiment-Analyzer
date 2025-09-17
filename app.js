document.addEventListener('DOMContentLoaded', function() {
    const apiTokenInput = document.getElementById('apiToken');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const resultContainer = document.getElementById('resultContainer');
    const reviewTextElement = document.getElementById('reviewText');
    const sentimentResultElement = document.getElementById('sentimentResult');
    
    let reviews = [];
    
    // Load and parse the TSV file using Papa Parse
    fetch('reviews_test.tsv')
        .then(response => response.text())
        .then(tsvData => {
            const parsedData = Papa.parse(tsvData, {
                header: true,
                delimiter: '\t',
                skipEmptyLines: true
            });
            
            if (parsedData.errors && parsedData.errors.length > 0) {
                showError('Error parsing TSV file: ' + parsedData.errors[0].message);
                return;
            }
            
            reviews = parsedData.data
                .map(row => row.text)
                .filter(text => text && text.trim() !== '');
                
            if (reviews.length === 0) {
                showError('No reviews found in the TSV file');
                return;
            }
            
            analyzeBtn.disabled = false;
        })
        .catch(error => {
            showError('Error loading TSV file: ' + error.message);
        });
    
    analyzeBtn.addEventListener('click', function() {
        // Reset UI
        hideError();
        resultContainer.style.display = 'none';
        loadingElement.style.display = 'block';
        analyzeBtn.disabled = true;
        
        // Select a random review
        const randomIndex = Math.floor(Math.random() * reviews.length);
        const randomReview = reviews[randomIndex];
        
        // Display the review
        reviewTextElement.textContent = randomReview;
        
        // Prepare API request
        const apiToken = apiTokenInput.value.trim();
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (apiToken) {
            headers['Authorization'] = `Bearer ${apiToken}`;
        }
        
        // Call Hugging Face API
        fetch('https://api-inference.huggingface.co/models/siebert/sentiment-roberta-large-english', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ inputs: randomReview })
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Invalid API token');
                } else if (response.status === 429) {
                    throw new Error('API rate limit exceeded. Please try again later or use an API token.');
                } else {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }
            }
            return response.json();
        })
        .then(data => {
            if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0]) && data[0].length > 0) {
                const result = data[0][0];
                displaySentiment(result);
            } else {
                throw new Error('Unexpected API response format');
            }
        })
        .catch(error => {
            showError('Analysis failed: ' + error.message);
        })
        .finally(() => {
            loadingElement.style.display = 'none';
            analyzeBtn.disabled = false;
        });
    });
    
    function displaySentiment(result) {
        sentimentResultElement.innerHTML = '';
        sentimentResultElement.className = 'sentiment-result';
        
        let icon, label, sentimentClass;
        
        if (result.label === 'POSITIVE' && result.score > 0.5) {
            icon = '<i class="fas fa-thumbs-up"></i>';
            label = 'Positive';
            sentimentClass = 'positive';
        } else if (result.label === 'NEGATIVE' && result.score > 0.5) {
            icon = '<i class="fas fa-thumbs-down"></i>';
            label = 'Negative';
            sentimentClass = 'negative';
        } else {
            icon = '<i class="fas fa-question-circle"></i>';
            label = 'Neutral';
            sentimentClass = 'neutral';
        }
        
        const resultDiv = document.createElement('div');
        resultDiv.innerHTML = `${icon} <span>${label} (${(result.score * 100).toFixed(1)}%)</span>`;
        sentimentResultElement.appendChild(resultDiv);
        sentimentResultElement.classList.add(sentimentClass);
        
        resultContainer.style.display = 'block';
    }
    
    function showError(message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        loadingElement.style.display = 'none';
        analyzeBtn.disabled = false;
    }
    
    function hideError() {
        errorElement.style.display = 'none';
    }
});