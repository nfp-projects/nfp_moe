/* eslint-disable */
exports.up = function(knex) {
  return Promise.all([
    knex.schema.raw('create index pages_gettree_index on pages (name asc) where not is_deleted'),
    knex.schema.raw('create index pages_featuredpublish_index on articles (published_at desc) where is_featured = true and not is_deleted'),
    knex.schema.raw('create index pages_publish_index on articles (published_at desc) where is_deleted = false'),
  ])
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.table('pages', function(table) {
      table.dropIndex('pages_gettree_index')
    })
  ])
};
