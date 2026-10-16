import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';

export const SearchHistory = sequelize.define(
  'SearchHistory',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    contentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    searchType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'search_histories',
    timestamps: true,
    indexes: [
      {
        fields: ['userId'],
      },
    ],
  }
);

export default SearchHistory;
