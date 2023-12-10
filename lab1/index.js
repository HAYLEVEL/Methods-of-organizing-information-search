const termInput = document.getElementById('term');
const documentInput = document.getElementById('document');
const searchInput = document.getElementById('search');
const termForm = document.getElementById('term-form');
const documentForm = document.getElementById('document-form');
const searchForm = document.getElementById('search-form');
const termResult = document.getElementById('term-result');
const documentResult = document.getElementById('document-result');
const searchResult = document.getElementById('search-result');
const searchqueryResult = document.getElementById('search-query');
const termSection = document.getElementById('terms-section');
const documentSection = document.getElementById('documents-section');
const searchSection = document.getElementById('search-section');
const termResultSection = document.getElementById('terms-result-section');
const nextStageButton = document.getElementById('document-next-stage-button');
const documentresultSection = document.getElementById('documention-result-section');
const searchResultSection = document.getElementById('search-result-section');

documentSection.style.display = 'none';
searchSection.style.display = 'none';
documentresultSection.style.display = 'none';
// ____________________________________________________
let terms;
let documents = [];
let documentsObject;
let currentDocId = 0;

const onTermFormSubmit = event => {
  event.preventDefault();
  const text = termInput.value;
  if (!text) {
    alert('Enter at least one term');
    return;
  }
  terms = [
    ...new Set(
      text
        .toLowerCase()
        .split(', ')
        .map(line => line.trim()),
    ),
  ];

  const termsToDisplay = terms.map((term, i) => `term ${i + 1}: "${term}"`).join('<br>');
  termSection.style.display = 'none';
  termResultSection.style.display = 'block';
  document.getElementById('terms-result').innerHTML = termsToDisplay;
  documentSection.style.display = 'block';
};

const onNextStageClicked = () => {
  if (!documents?.length || documents?.length < 1) {
    alert('Enter at least one document');
    return;
  }
  documentSection.style.display = 'none';
  searchSection.style.display = 'block';
};

const onDocumentFormSubmit = event => {
  event.preventDefault();
  const text = documentInput.value;
  if (!text) {
    alert('Enter the contents of the document');
    return;
  }
  documentresultSection.style.display = 'block';
  documents.push(text);
  document.getElementById('documention-result').innerHTML = documents
    .map((doc, i) => `document ${i + 1}: "${doc}"`)
    .join('<br>');
  documentsObject = createDocumentObject(documents, terms);
  documentForm.reset();
};

const onSearchFormSubmit = event => {
  event.preventDefault();
  const text = searchInput.value;
  if (!text) {
    alert(''); //search emty
    return;
  }
  if (!isDNF(text)) {
    alert(''); //not dnf form
    return;
  }
  const searchRes = booleanModel(text, documentsObject);
  if (!searchRes) {
    return;
  }
  searchResultSection.style.display = 'block';
  searchqueryResult.innerHTML = text;
  searchResult.innerHTML = searchRes?.length
    ? `Documents matching the search results: ${searchRes}`
    : 'Documents not found';
  searchForm.reset();
};

termForm.addEventListener('submit', onTermFormSubmit);
nextStageButton.addEventListener('click', onNextStageClicked);
documentForm.addEventListener('submit', onDocumentFormSubmit);
searchForm.addEventListener('submit', onSearchFormSubmit);

// ______________________________________________________
function isDNF(query) {
  if (
    query.includes(') AND') ||
    query.includes('AND (') ||
    query.includes('NOT (') ||
    query.includes('NOT NOT')
  ) {
    return false;
  }
  return true;
}

const getTerms = query =>
  query
    .split(/(\(|\)|\s+OR\s+|\s+AND\s+|\s+NOT\s+)/)
    .map(term => term.trim())
    .filter(term => !!term);

const getSubTerms = (terms = []) => {
  let subterms;
  if (terms.includes('(')) {
    subterms = [[]];
    let subtermIndex = 0;
    let skipIterationIdx;
    terms.forEach((term, i) => {
      if (i !== skipIterationIdx) {
        if (term === ')') {
          subtermIndex += 1;
          subterms[subtermIndex] = [];
          if (terms?.[i + 1]) {
            subterms[subtermIndex].push(terms?.[i + 1]);
            subtermIndex += 1;
            subterms[subtermIndex] = [];
            skipIterationIdx = i + 1;
          }
        }
        if (term === '(') {
          if (terms?.[i - 1] && terms?.[i - 2] !== ')') {
            subterms[subtermIndex].pop();
            subtermIndex += 1;
            subterms[subtermIndex] = [terms?.[i - 1]];
          }
          subtermIndex += 1;
          subterms[subtermIndex] = [];
        }
        if (term !== ')' && term !== '(') {
          subterms[subtermIndex].push(term);
        }
      } else {
        skipIterationIdx = undefined;
      }
    });
  }
  return subterms?.filter(el => el.length > 0);
};

const searchBySubterms = (terms, docs) => {
  let result = [];
  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];

    if (term === 'AND' || term === 'OR' || term === 'NOT' || term === '(' || term === ')') {
      continue;
    } else if (term.startsWith('NOT ')) {
      const notTerm = term.substring(4);
      const notResult = [];

      for (const doc in docs) {
        if (!docs.hasOwnProperty(doc)) {
          continue;
        }
        if (!docs[doc].includes(notTerm)) {
          notResult.push(doc);
        }
      }

      if (notResult.length > 0) {
        if (result.length === 0) {
          result = notResult;
        } else if (terms[i - 1] === 'OR') {
          result = [...new Set([...result, ...notResult])];
        } else if (terms[i - 1] === 'AND') {
          result = result.filter(doc => notResult.includes(doc));
        }
      }
    } else {
      const termResult = [];

      for (const doc in docs) {
        if (!docs.hasOwnProperty(doc)) {
          continue;
        }

        if (docs[doc].includes(term)) {
          termResult.push(doc);
        }
      }
      if (termResult.length > 0) {
        if (result.length === 0) {
          result = termResult;
        } else if (terms[i - 1] === 'OR') {
          result = [...new Set([...result, ...termResult])];
        } else if (terms[i - 1] === 'AND') {
          result = result.filter(doc => termResult.includes(doc));
        }
      }
    }
  }
  return result;
};

function booleanModel(query, docs) {
  const newTerms = getTerms(query);
  let shouldQuit = false;
  newTerms.forEach(newTerm => {
    if (
      newTerm !== 'AND' &&
      newTerm !== 'OR' &&
      newTerm !== 'NOT' &&
      newTerm !== '(' &&
      newTerm !== ')'
    ) {
      if (newTerm.startsWith('NOT ')) {
        newTerm = newTerm.substring(4);
      }
      if (!terms.includes(newTerm)) {
        shouldQuit = true;
        console.log(newTerm);
        alert('Unknown term in query');
      }
    }
  });
  if (shouldQuit) {
    return false;
  }
  const subterms = getSubTerms(newTerms);

  if (subterms?.length > 0) {
    const subresults = subterms.map((sterms, i) => {
      if (i % 2 === 0) {
        return searchBySubterms(sterms, docs);
      }
      return sterms[0];
    });
    let result = [];
    for (let i = 1; i < subresults.length - 1; i += 2) {
      if (result.length === 0) {
        if (i === 1) {
          if (subresults[i] === 'OR') {
            result = [...subresults[i - 1], ...subresults[i + 1]];
          } else if (subresults[i] === 'AND') {
            result = subresults[i - 1].filter(doc => subresults[i + 1].includes(doc));
          }
        } else {
          if (subresults[i] === 'OR') {
            result = [...result, ...subresults[i + 1]];
          } else if (subresults[i] === 'AND') {
            result = result.filter(doc => subresults[i + 1].includes(doc));
          }
        }
      } else if (result.length > 0) {
        if (subresults[i] === 'OR') {
          result = [...result, ...subresults[i + 1]];
        } else if (subresults[i] === 'AND') {
          result = result.filter(doc => subresults[i + 1].includes(doc));
        }
      }
    }
    return [...new Set(result)];
  }

  return searchBySubterms(newTerms, docs);
}
function getWordsFromString(str) {
  const strippedStr = str.replace(/[^\w\s]/gi, '').toLowerCase();
  const words = strippedStr.split(/\s+/);

  return words;
}

function createDocumentObject(documents, terms) {
  const docs = {};
  for (let i = 0; i < documents.length; i++) {
    const doc = getWordsFromString(documents[i]);
    const docTerms = [];
    for (let j = 0; j < terms.length; j++) {
      const term = terms[j];
      if (doc.includes(term)) {
        docTerms.push(term);
      }
    }
    docs[i + 1] = docTerms;
  }
  return docs;
}
