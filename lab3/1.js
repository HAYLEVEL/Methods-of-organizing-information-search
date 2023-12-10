const elasticsearch = require('elasticsearch');
const readline = require('readline');

const client = new elasticsearch.Client({
  host: 'localhost:9200',
});

const indexName = 'games1';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const indexMapping = {
  properties: {
    name: { type: 'keyword' },
    main_character: { type: 'keyword' },
    date: { type: 'date' },
    developers: { type: 'keyword' },
    description: { type: 'text', analyzer: 'standard' }, 
    plot: { type: 'text', analyzer: 'english' }, 
    response: { type: 'text', analyzer: 'custom_analyzer' }, 
  },
};

function createDocument(callback) {
  rl.question('Name: ', (name) => {
    rl.question('Main_character: ', (main_character) => {
      rl.question('Publication Date (YYYY-MM-DD): ', (date) => {
        rl.question('Developers: ', (developers) => {
          rl.question('Description: ', (description) => {
            rl.question('Plot: ', (plot) => {
              rl.question('Response: ', (response) => {
                client
                  .index({
                    index: indexName,
                    body: {
                      name,
                      main_character,
                      date,
                      developers: developers
                        .split(',')
                        .map((keyword) => keyword.trim()),
                      description,
                      plot,
                      response,
                    },
                  })
                  .then((response) => {
                    console.log('Document created:', response);
                    callback();
                  })
                  .catch((error) => {
                    console.error('Error creating document:', error);
                    callback();
                  });
              });
            });
          });
        });
      });
    });
  });
}

function searchDocuments(callback) {
  rl.question('Search by (name, main_character, date, developers): ', (field) => {
    rl.question('Search value: ', (value) => {
      const filter =
        field === 'date' ? 'range' : 'term';
      const query =
        filter === 'range'
          ? { range: { [field]: { gte: value } } }
          : { term: { [field]: value } };
      client
        .search({
          index: indexName,
          body: {
            query: {
              bool: {
                filter: [query],
              },
            },
          },
        })
        .then((response) => {
          console.log(
            'Search results:',
            JSON.stringify(response.hits.hits, null, 4)
          );
          callback();
        })
        .catch((error) => {
          console.error('Error searching documents:', error);
          callback();
        });
    });
  });
}

function deleteDocument(callback) {
	rl.question('Document ID to delete: ', (id) => {
    	client
        	.delete({
            	index: indexName,
            	id,
        	})
        	.then((response) => {
            	console.log('Document deleted:', response);
            	callback();
        	})
        	.catch((error) => {
            	console.error('Error deleting document:', error);
            	callback();
        	});
	});
}

function fuzzinessSearch(callback) {
	rl.question('Search by (name, main_character): ', (field) => {
    	rl.question('Search value (fuzzy syntax): ', (value) => {
        	client
            	.search({
                	index: indexName,
                	body: {
                    	query: {
                        	fuzzy: {
                            	[field]: {
                                	value: value,
                                	fuzziness: 2
                            	}
                        	},
                    	},
                	},
            	})
            	.then((response) => {
                	console.log('Search results:', JSON.stringify(response.hits.hits, null, 4));
                	callback();
            	})
            	.catch((error) => {
                	console.error('Error searching documents:', error);
                	callback();
            	});
    	});
	});
}

function getAllDocuments(callback) {
  client
    .search({
      index: indexName,
      body: {
        query: {
          match_all: {},
        },
      },
    })
    .then((response) => {
      console.log(
        'All documents:',
        JSON.stringify(response.hits.hits, null, 4)
      );
      callback();
    })
    .catch((error) => {
      console.error('Error getting all documents:', error);
      callback();
    });
}

function searchFullText(callback) {
  rl.question(
    'Search by (description, plot, response): ',
    (field) => {
      rl.question('Search value: ', (value) => {
        client
          .search({
            index: indexName,
            body: {
              query: {
                match: {
                  [field]: value,
                },
              },
            },
          })
          .then((response) => {
            console.log(
              'Search results:',
              JSON.stringify(response.hits.hits, null, 4)
            );
            callback();
          })
          .catch((error) => {
            console.error('Error searching documents:', error);
            callback();
          });
      });
    }
  );
}

function mainMenu() {
  rl.question('Choose action (1-create, 2-search, 3-delete, 4-fuzzy, 5-all, 6-full text): ', (action) => {
    if (action === 'create' || action === '1') {
      createDocument(mainMenu);
    } else if (action === 'search' || action === '2') {
      searchDocuments(mainMenu);
    } else if (action === 'delete' || action === '3') {
      deleteDocument(mainMenu);
    } else if (action === 'fuzzy' || action === '4') {
        fuzzinessSearch(mainMenu);
    } else if (action === 'get all' || action === '5') {
      getAllDocuments(mainMenu);
    } else if (action === 'full text search' || action === '6') {
      searchFullText(mainMenu);
    } else {
      console.error('Invalid action');
      rl.close();
    }
  });
}


client.indices
  .exists({ index: indexName })
  .then((exists) => {
    if (!exists) {
      createIndex();
    } else {
      mainMenu();
    }
  })
  .catch((error) => {
    console.error('Error checking index existence:', error);
  });

function createIndex() {
  client.indices
    .create({
      index: indexName,
      body: {
        settings: {
          analysis: {
            analyzer: {
              custom_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                char_filter: ['html_strip'],
                filter: ['lowercase', 'asciifolding'],
              },
            },
          },
        },
        mappings: indexMapping,
      },
    })
    .then((response) => {
      console.log('Index created:', response);
      mainMenu();
    })
    .catch((error) => {
      console.error('Error creating index:', error);
    });
}