import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/db.config.js';
import { generateProfilePicture, hashPassword } from '../helpers/helper.js';
import SearchHistory from './searchHistory.model.js';

/**
 * Sequelize User Model for MySQL (AWS RDS).
 */
export const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastLogin: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    profilePic: {
      type: DataTypes.STRING,
      defaultValue: generateProfilePicture,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verificationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await hashPassword(user.password);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await hashPassword(user.password);
        }
      },
    },
  }
);

// Association with SearchHistory
User.hasMany(SearchHistory, { foreignKey: 'userId', as: 'searchHistory', onDelete: 'CASCADE' });
SearchHistory.belongsTo(User, { foreignKey: 'userId' });

/**
 * Compares plain-text password with stored hash.
 */
User.prototype.comparePassword = async function (userPassword) {
  return bcrypt.compare(userPassword, this.password);
};

/**
 * Compatibility getters for existing codebase references.
 */
Object.defineProperty(User.prototype, '_id', {
  get() {
    return this.id;
  },
});

Object.defineProperty(User.prototype, '_doc', {
  get() {
    return this.toJSON();
  },
});

/**
 * Static finder helper compatible with legacy Mongoose findById.
 */
User.findById = function (id, options = {}) {
  return User.findByPk(id, options);
};

export default User;
