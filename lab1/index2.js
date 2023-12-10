const documentInput = document.getElementById('document');
const searchInput = document.getElementById('search');
const documentForm = document.getElementById('document-form');
const searchForm = document.getElementById('search-form');
const documentResult = document.getElementById('document-result');
const searchResult = document.getElementById('search-result');
const searchqueryResult = document.getElementById('search-query');
const documentSection = document.getElementById('documents-section');
const searchSection = document.getElementById('search-section');
const nextStageButton = document.getElementById('document-next-stage-button');
const documentresultSection = document.getElementById('documention-result-section');
const searchResultSection = document.getElementById('search-result-section');

documentSection.style.display = 'block';
searchSection.style.display = 'none';
// ____________________________________________________
let documents = [];
let currentDocId = 0;
let doc_vectors = [];
let idf;
const threshold = 0.15;

const onNextStageClicked = () => {
  if (!documents?.length || documents?.length < 1) {
    alert('No documents!');
    return;
  }
  documentSection.style.display = 'none';
  searchSection.style.display = 'block';

  idf = calculate_idf(documents);
  doc_vectors = calculate_tf_idf(documents, idf);
};

const onDocumentFormSubmit = event => {
  event.preventDefault();
  const text = documentInput.value;
  if (!text) {
    alert('Document is empty!');
    return;
  }
  documentresultSection.style.display = 'block';
  documents.push(text);
  document.getElementById('documention-result').innerHTML = documents
    .map((doc, i) => `document ${i + 1}: "${doc}"`)
    .join('<br>');
  documentForm.reset();
};

const onSearchFormSubmit = event => {
  event.preventDefault();
  const query = searchInput.value;
  if (!query) {
    alert('Enter searh query');
    return;
  }
  // рахує tfidf
  const query_vector = calculate_tf(query, idf);

  const results = [];
  for (let i = 0; i < documents.length; i++) {
    const similarity = cosine_similarity(query_vector, doc_vectors[i]);
    if (similarity > threshold) {
      results.push([i, similarity]);
    }
  }

  results.sort((a, b) => b[1] - a[1]);

  intervals = '';

  for (const [index, similarity] of results) {
    intervals += `similarity document ${index + 1}: ${similarity.toFixed(3)}<br>`;
  }

  searchResultSection.style.display = 'block';
  searchqueryResult.innerHTML = query;
  searchResult.innerHTML = results.length ? intervals : 'Documents';
  searchForm.reset();
};

nextStageButton.addEventListener('click', onNextStageClicked);
documentForm.addEventListener('submit', onDocumentFormSubmit);
searchForm.addEventListener('submit', onSearchFormSubmit);

// ______________________________________________________
function preprocess(text) {
  console.log(text.toLowerCase().match(/\w+/g));
  return text
    .replace(/[^\w\s]/gi, '')
    .toLowerCase()
    .split(/\s+/);
}

// inverse document frequency
function calculate_idf(documents) {
  const maxnt = {};
  const nt = {};
  const N = documents.length;
  let maxnt_num = 0;
  for (const document of documents) {
    const terms = preprocess(document);

    for (const term of terms) {
      maxnt[term] = (maxnt[term] || 0) + 1;
    }
  }
  console.log(maxnt)
  
  for (const document of documents) {
    const terms = preprocess(document);
    const newSet = new Set(terms); // 
    const terms_uniq = Array.from(newSet);
    for (const term of terms_uniq) {
      nt[term] = (nt[term] || 0) + 1;
    }
  }

  // Idf по формулі
  const updatedIdf = {};

  for (const term in maxnt) {
    if (N - maxnt[term] === 0 || maxnt[term] === 0) {
      updatedIdf[term] = 0;
    } else {
      updatedIdf[term] = Math.log(nt[term] / (1 + maxnt[term]));
    }
  }

  return updatedIdf;
}
// рахує tfidf
function calculate_tf(query, idf) {
  const tf = {};
  const terms = preprocess(query);

  for (const term of terms) {
    tf[term] = (tf[term] || 0) + 1;
  }

  const vector = [];

  for (const term in idf) {
    const tf_score = (tf[term] || 0);
    const tf_idf_score = tf_score * idf[term];
    vector.push(tf_idf_score);
  }
  return vector;
}

function calculate_tf_idf(documents, idf) {
  const tf_idf = [];

  for (const document of documents) {
    // term frequency
    // рахує tfidf
    const vector = calculate_tf(document, idf);
    tf_idf.push(vector);
  }

  return tf_idf;
}

function cosine_similarity(a, b) {
  let sum = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
    console.log(a[1])
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  return normA === 0 || normB === 0 ? 0 : sum / (normA * normB);
}