/* eslint-disable */
exports.up = function(knex) {
  return Promise.all([
    knex.schema.table('media', function(table) {
      table.text('small_image_avif')
      table.text('medium_image_avif')
      table.text('large_image_avif')
    })
  ])
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.table('media', function(table) {
      table.dropColumn('small_image_avif')
      table.dropColumn('medium_image_avif')
      table.dropColumn('large_image_avif')
    })
  ])
};
