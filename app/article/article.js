const m = require('mithril')
const ApiArticle = require('../api/article.p')
const Authentication = require('../authentication')
const Fileinfo = require('../widgets/fileinfo')

const Article = {
  oninit: function(vnode) {
    this.error = ''
    this.lastarticle = m.route.param('article') || '1'
    this.showcomments = false

    if (window.__nfpdata) {
      this.path = m.route.param('id')
      this.article = window.__nfpdata
      window.__nfpdata = null
    } else {
      this.fetchArticle(vnode)
    }
  },

  fetchArticle: function(vnode) {
    this.path = m.route.param('id')
    this.showcomments = false
    this.article = {
      id: 0,
      name: '',
      path: '',
      description: '',
      media: null,
      banner: null,
      files: [],
    }
    this.loading = true

    ApiArticle.getArticle(this.path)
    .then(function(result) {
      vnode.state.article = result
      if (result.parent) {
        document.title = result.name + ' - ' + result.parent.name + ' - NFP Moe'
      } else {
        document.title = result.name + ' - NFP Moe'
      }
    })
    .catch(function(err) {
      vnode.state.error = err.message
    })
    .then(function() {
      vnode.state.loading = false
      m.redraw()
    })
  },

  onupdate: function(vnode) {
    if (this.path !== m.route.param('id')) {
      this.fetchArticle(vnode)
      m.redraw()
    }
  },

  view: function(vnode) {
    var deviceWidth = window.innerWidth
    var imagePath = ''

    if (this.article.media) {
      var pixelRatio = window.devicePixelRatio || 1
      if ((deviceWidth < 800 && pixelRatio <= 1)
                || (deviceWidth < 600 && pixelRatio > 1)) {
        imagePath = this.article.media.medium_url
      } else {
        imagePath = this.article.media.large_url
      }
    }

    return (
      this.loading ?
        m('article.article', m('div.loading-spinner'))
      : m('article.article', [
          this.article.parent ? m('div.goback', ['« ', m(m.route.Link, { href: '/page/' + this.article.parent.path }, this.article.parent.name)]) : null,
          m('header', m('h1', this.article.name)),
          m('.fr-view', [
            this.article.media
              ? m('a.cover', {
                  rel: 'noopener',
                  href: this.article.media.link,
                }, m('img', { src: imagePath, alt: 'Cover image for ' + this.article.name }))
              : null,
            this.article.description ? m.trust(this.article.description) : null,
            (this.article.files && this.article.files.length
              ? this.article.files.map(function(file) {
                  return m(Fileinfo, { file: file })
                })
              : null),
            m('div.entrymeta', [
              'Posted ',
              (this.article.parent ? 'in' : ''),
              (this.article.parent ? m(m.route.Link, { href: '/page/' + this.article.parent.path }, this.article.parent.name) : null),
              'at ' + (this.article.published_at.replace('T', ' ').split('.')[0]).substr(0, 16),
              ' by ' + (this.article.staff && this.article.staff.fullname || 'Admin'),
            ]),
          ]),
          Authentication.currentUser
            ? m('div.admin-actions', [
              m('span', 'Admin controls:'),
              m(m.route.Link, { href: '/admin/articles/' + this.article.id }, 'Edit article'),
            ])
            : null,
          this.showcomments
            ? m('div.commentcontainer', [
                m('div#disqus_thread', { oncreate: function() {
                  let fullhost = window.location.protocol + '//' + window.location.host
                  /*eslint-disable */
                  window.disqus_config = function () {
                    this.page.url = fullhost + '/article/' + vnode.state.article.path
                    this.page.identifier = 'article-' + vnode.state.article.id
                  };
                  (function() { // DON'T EDIT BELOW THIS LINE
                    var d = document, s = d.createElement('script');
                    s.src = 'https://nfp-moe.disqus.com/embed.js';
                    s.setAttribute('data-timestamp', +new Date());
                    (d.head || d.body).appendChild(s);
                  })()
                  /*eslint-enable */
                }}, m('div.loading-spinner')),
              ])
            : m('button.opencomments', {
                onclick: function() { vnode.state.showcomments = true },
              }, 'Open comment discussion'),
        ])
    )
  },
}

module.exports = Article

/*
<div id="disqus_thread"></div>
<script>

/**
*  RECOMMENDED CONFIGURATION VARIABLES: EDIT AND UNCOMMENT THE SECTION BELOW TO INSERT DYNAMIC VALUES FROM YOUR PLATFORM OR CMS.
*  LEARN WHY DEFINING THESE VARIABLES IS IMPORTANT: https://disqus.com/admin/universalcode/#configuration-variables*/
/*
var disqus_config = function () {
this.page.url = PAGE_URL;  // Replace PAGE_URL with your page's canonical URL variable
this.page.identifier = PAGE_IDENTIFIER; // Replace PAGE_IDENTIFIER with your page's unique identifier variable
};
/
(function() { // DON'T EDIT BELOW THIS LINE
var d = document, s = d.createElement('script');
s.src = 'https://nfp-moe.disqus.com/embed.js';
s.setAttribute('data-timestamp', +new Date());
(d.head || d.body).appendChild(s);
})();
</script>
<noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>
*/
