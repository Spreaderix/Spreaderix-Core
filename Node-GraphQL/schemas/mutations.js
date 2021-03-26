const graphql = require("graphql");
const db = require("../pgAdaptor").db;
const { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLBoolean, GraphQLList } = graphql;
const { ProjectType, StoreType, StoreDataType, ShoeStoreDataType, ColumnInputType  } = require("./types");

const RootMutation = new GraphQLObjectType({
  name: "RootMutationType",
  type: "Mutation",
  fields: {
    addProject: { // add schema
      type: ProjectType,
      args: {
        schema_name: { type: GraphQLString }
      },
      resolve(parentValue, args) {
        const query = `CREATE SCHEMA IF NOT EXISTS ` + args.schema_name;

        return db
          .one(query)
          .then(res => res)
          .catch(err => err);
      }
    },
    deleteProject: { // delete schema
      type: ProjectType,
      args: {
        schema_name: { type: GraphQLString }
      },
      resolve(parentValue, args) {
        const query = `DROP SCHEMA IF EXISTS ` + args.schema_name + ` CASCADE`;

        return db
          .one(query)
          .then(res => res)
          .catch(err => err);
      }
    },
    addStore: { // add table
      type: GraphQLString,
      args: {
        schema_name: { type: GraphQLString },
        table_name: { type: GraphQLString },
        columns: { type: new GraphQLList(ColumnInputType) },
      },
      resolve(parentValue, args) {
        var columnString = '';
        args.columns.forEach((value, index, array) => {
          if (value && value.column_name && value.column_type) {
            columnString = columnString + `, ${value.column_name} ${value.column_type}`;
          }
        });

        const query = `CREATE TABLE IF NOT EXISTS ` + args.schema_name + `.` + args.table_name 
          + `(id serial primary key ` + columnString + `)`;

        return db
          .one(query)
          .then(res => res)
          .catch(err => err);
      }
    },
    deleteStore: {  // delete table
      type: StoreType,
      args: {
        schema_name: { type: GraphQLString },
        table_name: { type: GraphQLString }
      },
      resolve(parentValue, args) {
        const query = `DROP TABLE IF EXISTS ` + args.schema_name + `.` + args.table_name;

        return db
          .one(query)
          .then(res => res)
          .catch(err => err);
      }
    },
    addShoeStoreData: { // add shoe store data 
      type: ShoeStoreDataType,
      args: {
        schema_name: { type: GraphQLString },
        table_name: { type: GraphQLString },
        shoetype: { type: GraphQLString },
        shoecolor: { type: GraphQLString },
        shoesize: { type: GraphQLString },
      },
      resolve(parentValue, args) {
        const query = `INSERT INTO ` + args.schema_name + `.` + args.table_name 
          + ` (shoetype, shoecolor, shoesize) VALUES ('` + args.shoetype + `', '` + args.shoecolor + `', '` + args.shoesize + `') RETURNING id`;

          console.log(query);

        return db
          .one(query)
          .then(res => res)
          .catch(err => err);
      }
    }, 
    deleteStoreData: { // delete row from table 
      type: StoreDataType,
      args: {
        schema_name: { type: GraphQLString },
        table_name: { type: GraphQLString },
        record_id: { type: GraphQLID },
      },
      resolve(parentValue, args) {
        const query = `DELETE FROM ` + args.schema_name + `.` + args.table_name + ` where id = ` + args.record_id;

        return db
          .one(query)
          .then(res => res)
          .catch(err => err);
      }
    },
  }
});

exports.mutation = RootMutation;