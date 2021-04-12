const { db } = require("../pgAdaptor");
const { GraphQLObjectType, GraphQLString, GraphQLList } = require("graphql");
const { StoreDataType, ProjectType, StoreType, ShoeStoreDataType } = require("./types");

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  type: "Query",
  fields: {
    projects: {
      type: new GraphQLList(ProjectType),
      resolve(parentValue) {
        const query = `SELECT schema_name FROM information_schema.schemata where schema_name not in ` + 
        `(\'information_schema\',\'public\',\'pg_catalog\',\'pg_toast\',\'pg_toast_temp_1\',\'pg_temp_1\');`;

        return db
          .many(query)
          .then(res => res)
          .catch(err => err);
      }
    },  
    stores: {
      type: new GraphQLList(StoreType),
      args: { schema_name: { type: GraphQLString } },
      resolve(parentValue, args) {
        const query = `SELECT table_name FROM information_schema.tables WHERE table_schema = '` + args.schema_name + `'`;

        return db
          .many(query)
          .then(res => res)
          .catch(err => err);
      }
    },
    storeData: { // db table ids
      type: new GraphQLList(StoreDataType), 
      args: { schema_name: { type: GraphQLString }, store_name: { type: GraphQLString} },
      resolve(parentValue, args) {
        const query = `SELECT * FROM `+ args.schema_name + `.` + args.store_name;
        const values = [ args.schema_name, args.store_name ];

        return db
          .any(query, values)
          .then(res => res)
          .catch(err => err);
      }
    },
    shoeStoreData: { // db table content of shoestore
      type: new GraphQLList(ShoeStoreDataType), 
      args: { schema_name: { type: GraphQLString }, store_name: { type: GraphQLString} },
      resolve(parentValue, args) {
        const query = `SELECT * FROM `+ args.schema_name + `.` + args.store_name;
        const values = [ args.schema_name, args.store_name ];

        return db
          .any(query, values)
          .then(res => res)
          .catch(err => err);
      }
    },
  }
});

exports.query = RootQuery;