const graphql = require("graphql");
const { GraphQLObjectType, GraphQLString, GraphQLID, GraphQLObject, GraphQLInputObjectType, GraphQLList } = require("graphql");

const ProjectType = new GraphQLObjectType({ // db schemas
  name: "Project", 
  type: "Query",
  fields: {
    schema_name: { type: GraphQLString }
  }
}); 

const StoreType = new GraphQLObjectType({ // db tables 
  name: "Store", 
  type: "Query",
  fields: {
    table_name: { type: GraphQLString }
  }
});

const StoreDataType = new GraphQLObjectType({ // db table content - flexible...
  name: "StoreData", 
  type: "Query",
  fields: { 
   
    id: { type: GraphQLID },
    // columns: [ColumnType] ...
  }
});

const ShoeStoreDataType = new GraphQLObjectType({ // db table content - fixed
  name: "ShoeStoreData", 
  type: "Query",
  fields: { 
    id: { type: GraphQLID },
    shoetype: { type: GraphQLString },
    shoesize: { type: GraphQLString },
    shoecolor: { type: GraphQLString }  
  }
});

const ColumnInputType = new GraphQLInputObjectType({
  name: "Column", 
  type: "Query",
  fields: {
    column_name: { type: GraphQLString },
    column_type: { type: GraphQLString }
  }
}); 

exports.ProjectType = ProjectType; 
exports.StoreType = StoreType;
exports.StoreDataType = StoreDataType;
exports.ColumnInputType = ColumnInputType;
exports.ShoeStoreDataType = ShoeStoreDataType;
