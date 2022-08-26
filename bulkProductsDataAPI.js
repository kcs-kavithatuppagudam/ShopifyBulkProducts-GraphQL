const { GraphQLClient, gql } = require("graphql-request");
const fs = require("fs");
const https=require("https")

class GraphqlReq {
  client;
  pollQueryString;
  queryString = gql`
    mutation {
      bulkOperationRunQuery(
        query: """
        {
          products {
            edges {
              node {
                id
                title
              }
            }
          }
        }
        """
      ) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  constructor() {
    this.client = new GraphQLClient(
      "https://kavitha-2244.myshopify.com/admin/api/2022-07/graphql.json",
      {
        headers: {
          "X-Shopify-Access-Token": "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",
        },
      }
    );
  }

  async getProducts() {
    const { bulkOperationRunQuery } = await this.client.request(
      this.queryString,
      {}
    );

    console.log("bulkOperationRunQuery", bulkOperationRunQuery);

    if (bulkOperationRunQuery?.bulkOperation) {
      this.pollQueryString = gql`{
    node(id: "${bulkOperationRunQuery.bulkOperation.id}") {
      ... on BulkOperation {
        id
        status
        errorCode
        createdAt
        completedAt
        objectCount
        fileSize
        url
        partialDataUrl
      }
    }
  }
  `;

      const intervalId = setInterval(async () => {
        const { node } = await this.client.request(this.pollQueryString, {});
        const url=node.url
        if (node.status == "COMPLETED") {
          clearInterval(intervalId);
          https.get(url,(res)=>{
            const path='products.jsonl'
            const writeStream=fs.createWriteStream(path)
            res.pipe(writeStream)
            writeStream.on('finish',()=>{
              writeStream.close()
              console.log("download completed")
            })
          })
        }
      }, 1000);
    }
  }
}

const newGraphql = new GraphqlReq();

newGraphql.getProducts();
